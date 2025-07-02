// lib/enhanced-transaction-handler.ts
import Web3 from "web3";

export class EnhancedTransactionHandler {
  private web3: Web3;

  constructor(web3Instance: Web3) {
    this.web3 = web3Instance;
  }

  async executeTransactionWithRetry(
    transactionFunction: () => Promise<any>,
    maxRetries: number = 3,
    retryDelay: number = 2000
  ): Promise<{
    success: boolean;
    transactionHash?: string;
    receipt?: any;
    error?: string;
    gasUsed?: number;
    blockNumber?: number;
  }> {
    let lastError: string = "";
    let transactionHash: string | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🚀 Transaction attempt ${attempt}/${maxRetries}`);

        const result = await transactionFunction();

        if (result && result.transactionHash) {
          transactionHash = result.transactionHash;
          console.log(`✅ Transaction submitted: ${transactionHash}`);

          // Wait for confirmation
          const receipt = await this.waitForTransactionConfirmation(
            transactionHash,
            30000 // 30 seconds timeout
          );

          if (receipt && receipt.status) {
            console.log(`✅ Transaction confirmed: ${transactionHash}`);
            return {
              success: true,
              transactionHash,
              receipt,
              gasUsed: receipt.gasUsed,
              blockNumber: receipt.blockNumber,
            };
          } else {
            lastError = "Transaction failed on blockchain";
            console.log(
              `❌ Transaction failed on blockchain: ${transactionHash}`
            );
          }
        }
      } catch (error: any) {
        const errorMessage = error.message || error.toString();
        console.log(`⚠️ Transaction attempt ${attempt} error:`, errorMessage);

        // Handle specific error types
        if (this.isRecoverableError(errorMessage)) {
          lastError = errorMessage;

          // If we got a transaction hash from the error, try to wait for it
          const hashFromError =
            this.extractTransactionHashFromError(errorMessage);
          if (hashFromError) {
            console.log(
              `🔍 Found transaction hash in error, checking status: ${hashFromError}`
            );

            try {
              const receipt = await this.waitForTransactionConfirmation(
                hashFromError,
                30000
              );
              if (receipt && receipt.status) {
                console.log(
                  `✅ Transaction actually succeeded: ${hashFromError}`
                );
                return {
                  success: true,
                  transactionHash: hashFromError,
                  receipt,
                  gasUsed: receipt.gasUsed,
                  blockNumber: receipt.blockNumber,
                };
              }
            } catch (waitError) {
              console.log(`⚠️ Could not confirm transaction: ${hashFromError}`);
            }
          }

          if (attempt < maxRetries) {
            console.log(`⏳ Waiting ${retryDelay}ms before retry...`);
            await this.delay(retryDelay);
            retryDelay *= 1.5; // Exponential backoff
          }
        } else {
          // Non-recoverable error
          console.log(`❌ Non-recoverable error: ${errorMessage}`);
          return {
            success: false,
            error: errorMessage,
          };
        }
      }
    }

    // If we have a transaction hash but it failed, check one more time
    if (transactionHash) {
      console.log(`🔍 Final check for transaction: ${transactionHash}`);
      try {
        const receipt = await this.waitForTransactionConfirmation(
          transactionHash,
          10000
        );
        if (receipt && receipt.status) {
          console.log(
            `✅ Transaction succeeded on final check: ${transactionHash}`
          );
          return {
            success: true,
            transactionHash,
            receipt,
            gasUsed: receipt.gasUsed,
            blockNumber: receipt.blockNumber,
          };
        }
      } catch (finalError) {
        console.log(`❌ Final check failed for: ${transactionHash}`);
      }
    }

    return {
      success: false,
      error: lastError || "Transaction failed after all retries",
    };
  }

  private isRecoverableError(errorMessage: string): boolean {
    const recoverableErrors = [
      "already known",
      "replacement transaction underpriced",
      "nonce too low",
      "timeout",
      "network error",
      "connection error",
      "insufficient funds for gas",
      "gas limit exceeded",
      "transaction underpriced",
    ];

    const lowerError = errorMessage.toLowerCase();
    return recoverableErrors.some((error) => lowerError.includes(error));
  }

  private extractTransactionHashFromError(errorMessage: string): string | null {
    // Try to extract transaction hash from error message
    const hashRegex = /0x[a-fA-F0-9]{64}/;
    const match = errorMessage.match(hashRegex);
    return match ? match[0] : null;
  }

  private async waitForTransactionConfirmation(
    transactionHash: string,
    timeout: number = 30000
  ): Promise<any> {
    const startTime = Date.now();
    const checkInterval = 2000; // Check every 2 seconds

    while (Date.now() - startTime < timeout) {
      try {
        console.log(`🔍 Checking transaction status: ${transactionHash}`);
        const receipt = await this.web3.eth.getTransactionReceipt(
          transactionHash
        );

        if (receipt) {
          console.log(
            `📋 Transaction receipt found: ${transactionHash}, status: ${receipt.status}`
          );
          return receipt;
        }

        // Check if transaction is pending
        const transaction = await this.web3.eth.getTransaction(transactionHash);
        if (transaction && transaction.blockNumber) {
          // Transaction is mined but receipt not yet available
          console.log(
            `⏳ Transaction mined but receipt pending: ${transactionHash}`
          );
        } else if (transaction) {
          console.log(`⏳ Transaction pending: ${transactionHash}`);
        } else {
          console.log(`❓ Transaction not found: ${transactionHash}`);
          break;
        }

        await this.delay(checkInterval);
      } catch (error) {
        console.log(`⚠️ Error checking transaction status:`, error);
        await this.delay(checkInterval);
      }
    }

    throw new Error(`Transaction confirmation timeout: ${transactionHash}`);
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // Method to check if a transaction already exists for duplicate prevention
  async checkExistingTransaction(
    fromAddress: string,
    toAddress: string,
    amount: string,
    timeWindow: number = 300000 // 5 minutes
  ): Promise<{ exists: boolean; transactionHash?: string }> {
    try {
      const currentBlock = await this.web3.eth.getBlockNumber();
      const blocksToCheck = Math.ceil(timeWindow / 15000); // Assume 15s block time

      for (let i = 0; i < blocksToCheck; i++) {
        const blockNumber = currentBlock - i;
        if (blockNumber < 0) break;

        try {
          const block = await this.web3.eth.getBlock(blockNumber, true);
          if (block && block.transactions) {
            for (const tx of block.transactions) {
              if (
                typeof tx === "object" &&
                tx.from?.toLowerCase() === fromAddress.toLowerCase() &&
                tx.to?.toLowerCase() === toAddress.toLowerCase() &&
                tx.value === amount
              ) {
                console.log(`🔍 Found existing transaction: ${tx.hash}`);
                return { exists: true, transactionHash: tx.hash };
              }
            }
          }
        } catch (blockError) {
          // Continue checking other blocks
          console.log(`⚠️ Error checking block ${blockNumber}:`, blockError);
        }
      }

      return { exists: false };
    } catch (error) {
      console.log(`⚠️ Error checking existing transactions:`, error);
      return { exists: false };
    }
  }
}

// Updated scheduled-payments/[scheduleId]/route.ts - mark_failed action
export async function handleMarkFailed(
  scheduleId: string,
  errorMessage: string,
  enhancedAPI: boolean,
  executorId: string,
  db: any
) {
  console.log(
    `❌ Attempting to mark schedule ${scheduleId} as failed: ${errorMessage} (Enhanced API: ${enhancedAPI})`
  );

  const currentSchedule = await db.collection("schedules").findOne({
    scheduleId,
  });

  if (!currentSchedule) {
    console.log(`❌ Schedule ${scheduleId} not found for failure marking`);
    throw new Error("Schedule not found");
  }

  // ENHANCED: Check if error is "already known" and might actually succeed
  if (errorMessage.toLowerCase().includes("already known")) {
    console.log(
      `🔍 "Already known" error detected - checking for existing transaction...`
    );

    // Wait a bit and check if the transaction actually succeeded
    await new Promise((resolve) => setTimeout(resolve, 5000)); // Wait 5 seconds

    // Try to find the transaction in recent blocks
    const web3 = new Web3(process.env.RPC_URL || "");
    const transactionHandler = new EnhancedTransactionHandler(web3);

    try {
      const existingTx = await transactionHandler.checkExistingTransaction(
        currentSchedule.walletAddress,
        currentSchedule.recipient,
        web3.utils.toWei(currentSchedule.amount.toString(), "ether"),
        300000 // 5 minutes
      );

      if (existingTx.exists && existingTx.transactionHash) {
        console.log(
          `✅ Found successful transaction: ${existingTx.transactionHash}`
        );

        // Transaction actually succeeded - mark as completed instead of failed
        const receipt = await web3.eth.getTransactionReceipt(
          existingTx.transactionHash
        );
        if (receipt && receipt.status) {
          console.log(
            `✅ Transaction confirmed successful - updating schedule as completed`
          );

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
            updatedAt: new Date(),
            processingBy: null,
            processingStarted: null,
            claimedBy: null,
            claimedAt: null,
            lastTransactionHash: existingTx.transactionHash,
            lastGasUsed: parseInt(receipt.gasUsed) || 0,
            lastBlockNumber: parseInt(receipt.blockNumber) || 0,
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
            transactionHash: existingTx.transactionHash,
            gasUsed: parseInt(receipt.gasUsed) || 0,
            blockNumber: parseInt(receipt.blockNumber) || 0,
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
            createdAt: new Date(),
          };

          await db
            .collection("executed_transactions")
            .insertOne(executionRecord);

          console.log(
            `✅ Schedule ${scheduleId} successfully recovered and marked as completed`
          );

          return {
            success: true,
            message:
              "Transaction actually succeeded - schedule updated as completed",
            recovered: true,
            transactionHash: existingTx.transactionHash,
            finalStatus: finalStatus,
            nextExecution: nextExecutionAt,
            executionCount: newExecutionCount,
          };
        }
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
  const now = new Date();
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

  return {
    success: true,
    message: "Schedule marked as permanently failed",
    willRetry: false,
    nextRetry: null,
    retryCount: 0,
    enhancedAPI: enhancedAPI || false,
  };
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
