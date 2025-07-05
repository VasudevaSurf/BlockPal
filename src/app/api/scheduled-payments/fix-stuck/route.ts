// src/app/api/scheduled-payments/fix-stuck/route.ts
import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get("auth-token")?.value;
    const decoded = verifyToken(token);

    if (!decoded) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { db } = await connectToDatabase();
    const now = new Date();
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);

    console.log(
      "🔍 Enhanced: Looking for stuck smart contract processing payments..."
    );

    // Enhanced query for stuck smart contract payments
    const stuckPayments = await db
      .collection("schedules")
      .find({
        status: "processing",
        processingStarted: { $lt: fiveMinutesAgo },
        username: decoded.username,
        smartContractEnabled: true,
        // STRICT: Exclude failed payments
        $and: [{ status: { $ne: "failed" } }],
      })
      .toArray();

    console.log(
      `📊 Enhanced: Found ${stuckPayments.length} stuck smart contract processing payments`
    );

    const fixedPayments = [];

    for (const payment of stuckPayments) {
      try {
        // STRICT: Do not fix failed payments
        if (payment.status === "failed") {
          console.log(
            `⏩ Enhanced: Skipping failed payment: ${payment.scheduleId}`
          );
          continue;
        }

        console.log(
          `🔧 Enhanced: Fixing stuck smart contract payment: ${payment.scheduleId}`
        );

        // Enhanced recovery logic for smart contract payments
        const recoveryResult = await attemptSmartContractRecovery(payment);

        if (recoveryResult.recovered) {
          console.log(
            `✅ Enhanced: Smart contract payment recovered: ${payment.scheduleId}`
          );

          // Update as successful execution
          const updateData = {
            status: recoveryResult.finalStatus,
            executedCount: (payment.executedCount || 0) + 1,
            lastExecutionAt: payment.processingStarted,
            updatedAt: now,
            processingBy: null,
            processingStarted: null,
            claimedBy: null,
            claimedAt: null,
            fixedStuckProcessing: true,
            fixedAt: now,
            recoveredTransactionHash: recoveryResult.transactionHash,
            smartContractRecovery: true,
            contractAddress: "0x9e4f241e8500eef9a1db6906c47401c8a0f04564",
          };

          if (recoveryResult.nextExecution) {
            updateData.nextExecutionAt = recoveryResult.nextExecution;
          } else {
            updateData.completedAt = now;
            updateData.nextExecutionAt = null;
          }

          const updateResult = await db.collection("schedules").updateOne(
            {
              _id: payment._id,
              status: { $ne: "failed" },
            },
            { $set: updateData }
          );

          if (updateResult.modifiedCount > 0) {
            fixedPayments.push({
              scheduleId: payment.scheduleId,
              oldStatus: "processing",
              newStatus: recoveryResult.finalStatus,
              action: "smart_contract_recovery",
              transactionHash: recoveryResult.transactionHash,
              nextExecution: recoveryResult.nextExecution?.toISOString(),
            });
          }
        } else {
          // Standard stuck payment fix
          if (payment.frequency === "once") {
            const updateResult = await db.collection("schedules").updateOne(
              {
                _id: payment._id,
                status: { $ne: "failed" },
              },
              {
                $set: {
                  status: "completed",
                  executedCount: 1,
                  lastExecutionAt: payment.processingStarted,
                  completedAt: now,
                  updatedAt: now,
                  processingBy: null,
                  processingStarted: null,
                  claimedBy: null,
                  claimedAt: null,
                  fixedStuckProcessing: true,
                  fixedAt: now,
                  nextExecutionAt: null,
                  smartContractFixed: true,
                },
              }
            );

            if (updateResult.modifiedCount > 0) {
              console.log(
                `✅ Enhanced: Fixed stuck smart contract payment: ${payment.scheduleId} → completed`
              );
              fixedPayments.push({
                scheduleId: payment.scheduleId,
                oldStatus: "processing",
                newStatus: "completed",
                action: "marked_as_completed",
                smartContract: true,
              });
            }
          } else {
            const nextExecution = calculateNextExecution(
              payment.processingStarted,
              payment.frequency
            );

            const updateResult = await db.collection("schedules").updateOne(
              {
                _id: payment._id,
                status: { $ne: "failed" },
              },
              {
                $set: {
                  status: "active",
                  executedCount: (payment.executedCount || 0) + 1,
                  lastExecutionAt: payment.processingStarted,
                  nextExecutionAt: nextExecution,
                  updatedAt: now,
                  processingBy: null,
                  processingStarted: null,
                  claimedBy: null,
                  claimedAt: null,
                  fixedStuckProcessing: true,
                  fixedAt: now,
                  smartContractFixed: true,
                },
              }
            );

            if (updateResult.modifiedCount > 0) {
              console.log(
                `✅ Enhanced: Fixed stuck recurring smart contract payment: ${
                  payment.scheduleId
                } → active (next: ${nextExecution.toISOString()})`
              );
              fixedPayments.push({
                scheduleId: payment.scheduleId,
                oldStatus: "processing",
                newStatus: "active",
                nextExecution: nextExecution.toISOString(),
                action: "reset_for_next_execution",
                smartContract: true,
              });
            }
          }
        }
      } catch (error) {
        console.error(
          `❌ Enhanced: Error fixing smart contract payment ${payment.scheduleId}:`,
          error
        );
        fixedPayments.push({
          scheduleId: payment.scheduleId,
          error: error.message,
          action: "failed_to_fix",
          smartContract: true,
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Enhanced: Fixed ${fixedPayments.length} stuck smart contract processing payments`,
      stuckPaymentsFound: stuckPayments.length,
      fixedPayments: fixedPayments,
      smartContractEnabled: true,
      contractAddress: "0x9e4f241e8500eef9a1db6906c47401c8a0f04564",
      timestamp: now.toISOString(),
    });
  } catch (error) {
    console.error(
      "💥 Enhanced: Error fixing stuck smart contract payments:",
      error
    );
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get("auth-token")?.value;
    const decoded = verifyToken(token);

    if (!decoded) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { db } = await connectToDatabase();
    const now = new Date();
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);

    // Enhanced query for stuck smart contract payments
    const stuckPayments = await db
      .collection("schedules")
      .find({
        status: "processing",
        processingStarted: { $lt: fiveMinutesAgo },
        username: decoded.username,
        smartContractEnabled: true,
        // STRICT: Exclude failed payments
        $and: [{ status: { $ne: "failed" } }],
      })
      .toArray();

    const paymentSummaries = stuckPayments.map((payment) => ({
      scheduleId: payment.scheduleId,
      tokenSymbol: payment.tokenSymbol,
      amount: payment.amount,
      recipient: payment.recipient,
      frequency: payment.frequency,
      processingStarted: payment.processingStarted,
      processingBy: payment.processingBy,
      minutesStuck: Math.round(
        (now.getTime() - new Date(payment.processingStarted).getTime()) / 60000
      ),
      smartContractEnabled: payment.smartContractEnabled || false,
      contractAddress: payment.contractAddress,
    }));

    return NextResponse.json({
      success: true,
      stuckPaymentsCount: stuckPayments.length,
      stuckPayments: paymentSummaries,
      smartContractEnabled: true,
      contractAddress: "0x9e4f241e8500eef9a1db6906c47401c8a0f04564",
      timestamp: now.toISOString(),
    });
  } catch (error) {
    console.error(
      "💥 Enhanced: Error checking stuck smart contract payments:",
      error
    );
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Enhanced smart contract recovery function
async function attemptSmartContractRecovery(payment: any): Promise<{
  recovered: boolean;
  transactionHash?: string;
  finalStatus?: string;
  nextExecution?: Date;
}> {
  try {
    console.log(
      `🔍 Enhanced: Attempting smart contract recovery for ${payment.scheduleId}`
    );

    // Check for recent transactions to the smart contract
    const rpcUrl = process.env.RPC_URL || process.env.NEXT_PUBLIC_RPC_URL;

    if (!rpcUrl) {
      console.log("⚠️ Enhanced: No RPC URL available for recovery check");
      return { recovered: false };
    }

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

    // Check last 20 blocks for smart contract transactions
    for (let i = 0; i < 20; i++) {
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
          // Check for transactions from our wallet to the smart contract
          if (
            tx.from?.toLowerCase() === payment.walletAddress.toLowerCase() &&
            tx.to?.toLowerCase() ===
              "0x9e4f241e8500eef9a1db6906c47401c8a0f04564"
          ) {
            // Get transaction receipt to check if successful
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
            if (receiptData.result && receiptData.result.status === "0x1") {
              console.log(
                `✅ Enhanced: Found successful smart contract transaction: ${tx.hash}`
              );

              // Determine final status and next execution
              let finalStatus = "completed";
              let nextExecution = null;

              if (payment.frequency && payment.frequency !== "once") {
                const next = calculateNextExecution(
                  new Date(),
                  payment.frequency
                );
                const maxExecutions = payment.maxExecutions || 999999;
                const newExecutionCount = (payment.executedCount || 0) + 1;

                if (newExecutionCount < maxExecutions) {
                  finalStatus = "active";
                  nextExecution = next;
                }
              }

              return {
                recovered: true,
                transactionHash: tx.hash,
                finalStatus,
                nextExecution,
              };
            }
          }
        }
      }
    }

    console.log(
      `🔍 Enhanced: No successful smart contract transaction found for ${payment.scheduleId}`
    );
    return { recovered: false };
  } catch (error) {
    console.error(
      `❌ Enhanced: Smart contract recovery error for ${payment.scheduleId}:`,
      error
    );
    return { recovered: false };
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
