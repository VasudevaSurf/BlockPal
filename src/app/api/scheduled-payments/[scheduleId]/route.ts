import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";

export async function PATCH(
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
    const body = await request.json();
    const { action, executorId } = body;

    const { db } = await connectToDatabase();
    const now = new Date();

    console.log(
      `🔄 Processing action '${action}' for schedule ${scheduleId} by executor ${executorId}`
    );

    if (action === "update_after_execution") {
      const {
        transactionHash,
        gasUsed,
        blockNumber,
        actualCostETH,
        actualCostUSD,
        executedAt,
        enhancedAPI,
      } = body;

      console.log(
        `📝 Updating schedule ${scheduleId} after successful enhanced execution`
      );

      const currentSchedule = await db.collection("schedules").findOne({
        scheduleId,
      });

      if (!currentSchedule) {
        console.log(`❌ Schedule ${scheduleId} not found`);
        return NextResponse.json(
          { error: "Schedule not found" },
          { status: 404 }
        );
      }

      // STRICT: Do not update failed payments
      if (currentSchedule.status === "failed") {
        console.log(`❌ Cannot update failed schedule ${scheduleId}`);
        return NextResponse.json(
          { error: "Cannot update a permanently failed payment" },
          { status: 400 }
        );
      }

      console.log(
        `📋 Found schedule ${scheduleId} with status: ${currentSchedule.status}, processingBy: ${currentSchedule.processingBy}`
      );

      const newExecutionCount = (currentSchedule.executionCount || 0) + 1;
      let finalStatus = "completed";
      let nextExecutionAt = null;
      let completedAt = new Date(executedAt);

      // For recurring payments, calculate next execution
      if (currentSchedule.frequency && currentSchedule.frequency !== "once") {
        const nextExecution = calculateNextExecution(
          new Date(executedAt),
          currentSchedule.frequency
        );

        const maxExecutions = currentSchedule.maxExecutions || 999999;
        if (
          newExecutionCount >= maxExecutions ||
          nextExecution.getFullYear() > new Date().getFullYear() + 50
        ) {
          finalStatus = "completed";
          completedAt = new Date(executedAt);
          console.log(
            `🏁 Recurring schedule ${scheduleId} completed after ${newExecutionCount} executions (Enhanced API)`
          );
        } else {
          finalStatus = "active";
          nextExecutionAt = nextExecution;
          completedAt = null;
          console.log(
            `🔄 Recurring schedule ${scheduleId} next execution: ${nextExecution.toISOString()} (Enhanced API)`
          );
        }
      } else {
        finalStatus = "completed";
        completedAt = new Date(executedAt);
        console.log(
          `🏁 One-time schedule ${scheduleId} completed (Enhanced API)`
        );
      }

      const updateData: any = {
        status: finalStatus,
        executionCount: newExecutionCount,
        lastExecutionAt: new Date(executedAt),
        updatedAt: now,
        processingBy: null,
        processingStarted: null,
        lastTransactionHash: transactionHash,
        lastGasUsed: parseInt(gasUsed) || 0,
        lastBlockNumber: parseInt(blockNumber) || 0,
        lastActualCostETH: parseFloat(actualCostETH) || 0,
        lastActualCostUSD: parseFloat(actualCostUSD) || 0,
        lastExecutedWithEnhancedAPI: enhancedAPI || false,
        lastExecutorId: executorId,
      };

      if (nextExecutionAt) {
        updateData.nextExecutionAt = nextExecutionAt;
      }

      if (completedAt) {
        updateData.completedAt = completedAt;
      }

      console.log(
        `💾 Updating schedule ${scheduleId} to status: ${finalStatus} (Enhanced API)`
      );

      // STRICT: Only update if not failed
      const updateResult = await db.collection("schedules").updateOne(
        {
          scheduleId,
          status: { $ne: "failed" }, // Ensure we never update failed payments
        },
        { $set: updateData }
      );

      if (updateResult.matchedCount === 0) {
        console.log(
          `❌ Schedule ${scheduleId} not found for update or has permanently failed`
        );
        return NextResponse.json(
          { error: "Schedule not found for update or has permanently failed" },
          { status: 404 }
        );
      }

      console.log(
        `✅ Schedule ${scheduleId} updated successfully - Status: ${finalStatus} (Enhanced API)`
      );

      const executionRecordId = `${scheduleId}_exec_${newExecutionCount}_${Date.now()}`;
      const executionRecord = {
        _id: executionRecordId,
        scheduleId,
        username: currentSchedule.username,
        walletAddress: currentSchedule.walletAddress,
        transactionHash,
        gasUsed: parseInt(gasUsed) || 0,
        blockNumber: parseInt(blockNumber) || 0,
        actualCostETH: parseFloat(actualCostETH) || 0,
        actualCostUSD: parseFloat(actualCostUSD) || 0,
        executedAt: new Date(executedAt),
        status: "completed",
        tokenSymbol: currentSchedule.tokenSymbol,
        contractAddress: currentSchedule.contractAddress,
        recipient: currentSchedule.recipient,
        amount: currentSchedule.amount,
        executionCount: newExecutionCount,
        executorId: executorId,
        enhancedAPI: enhancedAPI || false,
        createdAt: now,
      };

      try {
        await db
          .collection("executed_transactions")
          .updateOne(
            { _id: executionRecordId },
            { $setOnInsert: executionRecord },
            { upsert: true }
          );
        console.log(
          `✅ Execution record stored for schedule ${scheduleId} (Enhanced API)`
        );
      } catch (recordError) {
        console.error(
          `⚠️ Failed to store execution record for ${scheduleId}:`,
          recordError
        );
      }

      return NextResponse.json({
        success: true,
        message: "Schedule updated successfully with Enhanced API",
        nextStatus: finalStatus,
        nextExecution: nextExecutionAt,
        executionCount: newExecutionCount,
        transactionHash: transactionHash,
        enhancedAPI: true,
      });
    } else if (action === "mark_failed") {
      // ENHANCED: Smart failure handling with transaction recovery
      const { error: errorMessage, enhancedAPI } = body;

      console.log(
        `❌ Attempting to mark schedule ${scheduleId} as failed: ${errorMessage} (Enhanced API: ${enhancedAPI})`
      );

      const currentSchedule = await db.collection("schedules").findOne({
        scheduleId,
      });

      if (!currentSchedule) {
        console.log(`❌ Schedule ${scheduleId} not found for failure marking`);
        return NextResponse.json(
          { error: "Schedule not found" },
          { status: 404 }
        );
      }

      // ENHANCED: Check if error is "already known" and might actually succeed
      if (errorMessage.toLowerCase().includes("already known")) {
        console.log(
          `🔍 "Already known" error detected - scheduling delayed check...`
        );

        // Instead of immediately marking as failed, wait and check via external API
        await new Promise((resolve) => setTimeout(resolve, 8000)); // Wait 8 seconds for transaction to be mined

        try {
          // Use Alchemy/Infura API directly instead of web3 library
          const rpcUrl =
            process.env.RPC_URL ||
            process.env.NEXT_PUBLIC_RPC_URL ||
            "https://eth-mainnet.alchemyapi.io/v2/your-api-key";

          // Check if transaction exists by making direct RPC calls
          const checkTransactionExists = async (
            walletAddress: string,
            recipient: string
          ) => {
            try {
              // Get latest block number
              const latestBlockResponse = await fetch(rpcUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  jsonrpc: "2.0",
                  method: "eth_blockNumber",
                  params: [],
                  id: 1,
                }),
              });

              const latestBlockData = await latestBlockResponse.json();
              const latestBlock = parseInt(latestBlockData.result, 16);

              // Check last 10 blocks for transactions
              for (let i = 0; i < 10; i++) {
                const blockNumber = "0x" + (latestBlock - i).toString(16);

                const blockResponse = await fetch(rpcUrl, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    jsonrpc: "2.0",
                    method: "eth_getBlockByNumber",
                    params: [blockNumber, true],
                    id: 1,
                  }),
                });

                const blockData = await blockResponse.json();
                if (blockData.result && blockData.result.transactions) {
                  for (const tx of blockData.result.transactions) {
                    if (
                      tx.from?.toLowerCase() === walletAddress.toLowerCase() &&
                      tx.to?.toLowerCase() === recipient.toLowerCase()
                    ) {
                      // Check if transaction was successful
                      const receiptResponse = await fetch(rpcUrl, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          jsonrpc: "2.0",
                          method: "eth_getTransactionReceipt",
                          params: [tx.hash],
                          id: 1,
                        }),
                      });

                      const receiptData = await receiptResponse.json();
                      if (
                        receiptData.result &&
                        receiptData.result.status === "0x1"
                      ) {
                        return {
                          found: true,
                          hash: tx.hash,
                          gasUsed: parseInt(receiptData.result.gasUsed, 16),
                          blockNumber: parseInt(
                            receiptData.result.blockNumber,
                            16
                          ),
                        };
                      }
                    }
                  }
                }
              }

              return { found: false };
            } catch (error) {
              console.log(`⚠️ Error checking transactions:`, error);
              return { found: false };
            }
          };

          const transactionResult = await checkTransactionExists(
            currentSchedule.walletAddress,
            currentSchedule.recipient
          );

          if (transactionResult.found) {
            console.log(
              `✅ Found successful transaction: ${transactionResult.hash}`
            );

            // Transaction actually succeeded - mark as completed instead of failed
            const newExecutionCount = (currentSchedule.executionCount || 0) + 1;
            let finalStatus = "completed";
            let nextExecutionAt = null;
            let completedAt = new Date();

            // For recurring payments, calculate next execution
            if (
              currentSchedule.frequency &&
              currentSchedule.frequency !== "once"
            ) {
              const nextExecution = calculateNextExecution(
                new Date(),
                currentSchedule.frequency
              );

              const maxExecutions = currentSchedule.maxExecutions || 999999;
              if (
                newExecutionCount >= maxExecutions ||
                nextExecution.getFullYear() > new Date().getFullYear() + 50
              ) {
                finalStatus = "completed";
                completedAt = new Date();
              } else {
                finalStatus = "active";
                nextExecutionAt = nextExecution;
                completedAt = null;
              }
            }

            const updateData: any = {
              status: finalStatus,
              executionCount: newExecutionCount,
              lastExecutionAt: new Date(),
              updatedAt: now,
              processingBy: null,
              processingStarted: null,
              claimedBy: null,
              claimedAt: null,
              lastTransactionHash: transactionResult.hash,
              lastGasUsed: transactionResult.gasUsed || 0,
              lastBlockNumber: transactionResult.blockNumber || 0,
              lastExecutedWithEnhancedAPI: enhancedAPI || false,
              lastExecutorId: executorId,
              recoveredFromAlreadyKnownError: true,
              recoveredAt: new Date(),
            };

            if (nextExecutionAt) {
              updateData.nextExecutionAt = nextExecutionAt;
            }

            if (completedAt) {
              updateData.completedAt = completedAt;
            }

            await db
              .collection("schedules")
              .updateOne({ scheduleId }, { $set: updateData });

            // Store execution record
            const executionRecord = {
              scheduleId,
              username: currentSchedule.username,
              walletAddress: currentSchedule.walletAddress,
              transactionHash: transactionResult.hash,
              gasUsed: transactionResult.gasUsed || 0,
              blockNumber: transactionResult.blockNumber || 0,
              executedAt: new Date(),
              status: "completed",
              tokenSymbol: currentSchedule.tokenSymbol,
              contractAddress: currentSchedule.contractAddress,
              recipient: currentSchedule.recipient,
              amount: currentSchedule.amount,
              executionCount: newExecutionCount,
              executorId: executorId,
              enhancedAPI: enhancedAPI || false,
              recoveredFromError: true,
              createdAt: now,
            };

            await db
              .collection("executed_transactions")
              .insertOne(executionRecord);

            console.log(
              `✅ Schedule ${scheduleId} successfully recovered and marked as completed`
            );

            return NextResponse.json({
              success: true,
              message:
                "Transaction actually succeeded - schedule updated as completed",
              recovered: true,
              transactionHash: transactionResult.hash,
              finalStatus: finalStatus,
              nextExecution: nextExecutionAt,
              executionCount: newExecutionCount,
              enhancedAPI: true,
            });
          }
        } catch (recoveryError) {
          console.log(
            `⚠️ Could not recover transaction for ${scheduleId}:`,
            recoveryError
          );
          // Continue with marking as failed
        }
      }

      // If we reach here, either it's not an "already known" error or recovery failed
      // Mark as permanently failed
      await db.collection("schedules").updateOne(
        { scheduleId },
        {
          $set: {
            status: "failed",
            failedAt: now,
            lastError: errorMessage,
            updatedAt: now,
            processingBy: null,
            processingStarted: null,
            claimedBy: null,
            claimedAt: null,
            failedWithEnhancedAPI: enhancedAPI || false,
            lastExecutorId: executorId,
            nextExecutionAt: null,
          },
        }
      );

      console.log(`❌ Schedule ${scheduleId} marked as permanently failed`);

      return NextResponse.json({
        success: true,
        message: "Schedule marked as permanently failed",
        willRetry: false,
        nextRetry: null,
        retryCount: 0,
        enhancedAPI: enhancedAPI || false,
      });
    } else if (action === "cancel") {
      // STRICT: Only allow cancellation if not failed
      const currentSchedule = await db.collection("schedules").findOne({
        scheduleId,
        username: decoded.username,
      });

      if (!currentSchedule) {
        return NextResponse.json(
          { error: "Scheduled payment not found" },
          { status: 404 }
        );
      }

      if (currentSchedule.status === "failed") {
        return NextResponse.json(
          { error: "Cannot cancel a permanently failed payment" },
          { status: 400 }
        );
      }

      const result = await db.collection("schedules").updateOne(
        {
          scheduleId,
          username: decoded.username,
          status: { $ne: "failed" }, // Ensure we don't cancel failed payments
        },
        {
          $set: {
            status: "cancelled",
            cancelledAt: now,
            updatedAt: now,
            processingBy: null,
            processingStarted: null,
            claimedBy: null,
            claimedAt: null,
            cancelledBy: executorId || "user",
          },
        }
      );

      if (result.matchedCount === 0) {
        return NextResponse.json(
          { error: "Scheduled payment not found or cannot be cancelled" },
          { status: 404 }
        );
      }

      console.log(`✅ Schedule ${scheduleId} cancelled successfully`);

      return NextResponse.json({
        success: true,
        message: "Scheduled payment cancelled successfully",
      });
    } else {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("💥 Error updating schedule:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

function calculateNextExecution(lastExecution: Date, frequency: string): Date {
  const nextExecution = new Date(lastExecution);

  switch (frequency) {
    case "daily":
      nextExecution.setDate(nextExecution.getDate() + 1);
      break;
    case "weekly":
      nextExecution.setDate(nextExecution.getDate() + 7);
      break;
    case "monthly":
      nextExecution.setMonth(nextExecution.getMonth() + 1);
      break;
    case "yearly":
      nextExecution.setFullYear(nextExecution.getFullYear() + 1);
      break;
    default:
      nextExecution.setFullYear(nextExecution.getFullYear() + 100);
      break;
  }

  return nextExecution;
}
