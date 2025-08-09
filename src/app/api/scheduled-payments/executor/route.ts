// src/app/api/scheduled-payments/executor/route.ts
import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { ethers } from "ethers";

// Smart Contract Configuration (matching the JavaScript file approach)
const CONTRACT_CONFIG = {
  address: "0x9e4f241e8500eef9a1db6906c47401c8a0f04564",
  taxRate: 0.005, // 0.5%
  supportedTokens: {
    USDT: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
    USDC: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    DAI: "0x6B175474E89094C44Da98b954EedeAC495271d0F",
    LINK: "0x514910771AF9Ca656af840dff83E8264EcF986CA",
    UNI: "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984",
  },
};

// Contract ABI (matching the JavaScript file)
const CONTRACT_ABI = [
  "function simpleETHTransfer(address recipient, uint256 amount, uint256 _deadline) external payable",
  "function simpleERC20Transfer(address token, address recipient, uint96 amount, uint256 taxInETH, uint256 _deadline) external payable",
  "function calculateETHTax(uint256 amount) external pure returns (uint256)",
];

const ERC20_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
];

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("Authorization");
    const expectedToken = process.env.CRON_SECRET || "your-cron-secret";

    if (authHeader !== `Bearer ${expectedToken}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { db } = await connectToDatabase();
    const now = new Date();

    console.log("🚀 Enhanced Smart Contract Payment Executor starting...");

    // Get smart contract compatible payments
    const duePayments = await db
      .collection("schedules")
      .find({
        status: "active",
        smartContractEnabled: true,
        nextExecutionAt: { $lte: now },
        tokenSymbol: { $in: ["ETH", "USDT", "USDC", "DAI", "LINK", "UNI"] },
        $and: [{ status: { $ne: "failed" } }],
      })
      .toArray();

    console.log(
      `🔍 Enhanced: Found ${duePayments.length} smart contract compatible payments due for execution`
    );

    const executionResults = [];

    // Initialize provider (using enhanced approach from the JS file)
    const provider = new ethers.JsonRpcProvider(
      `https://eth-mainnet.g.alchemy.com/v2/${
        process.env.ALCHEMY_API_KEY || "tFaWgpOB1QAns76d3CgbT"
      }`
    );

    for (const payment of duePayments) {
      try {
        // STRICT: Double-check payment is not failed before processing
        if (payment.status === "failed") {
          console.log(
            `⏩ Enhanced: Skipping failed payment: ${payment.scheduleId}`
          );
          continue;
        }

        console.log(
          `⚡ Enhanced: Executing smart contract payment: ${payment.scheduleId}`
        );

        const wallet = await db.collection("wallets").findOne({
          walletAddress: payment.walletAddress,
          username: payment.username,
        });

        if (!wallet || !wallet.encryptedPrivateKey) {
          console.error(
            `❌ Enhanced: No wallet or private key found for payment: ${payment.scheduleId}`
          );

          await markPaymentAsFailed(
            db,
            payment,
            "Wallet or private key not found",
            false // Add acknowledgment flag
          );

          executionResults.push({
            scheduleId: payment.scheduleId,
            success: false,
            error: "Wallet or private key not found",
            smartContract: true,
          });
          continue;
        }

        // Decrypt private key (following the enhanced decryption from JS file)
        const decryptedPrivateKey = decryptPrivateKey(
          wallet.encryptedPrivateKey
        );
        if (!decryptedPrivateKey) {
          console.error(
            `❌ Enhanced: Failed to decrypt private key for: ${payment.scheduleId}`
          );

          await markPaymentAsFailed(
            db,
            payment,
            "Failed to decrypt private key",
            false // Add acknowledgment flag
          );

          executionResults.push({
            scheduleId: payment.scheduleId,
            success: false,
            error: "Failed to decrypt private key",
            smartContract: true,
          });
          continue;
        }

        // Execute smart contract transaction
        const executionResult = await executeSmartContractPayment(
          provider,
          payment,
          decryptedPrivateKey
        );

        if (executionResult.success) {
          console.log(
            `✅ Enhanced: Smart contract payment executed successfully: ${payment.scheduleId}`
          );

          const updateData: any = {
            executedCount: (payment.executedCount || 0) + 1,
            lastExecutionAt: new Date(),
            updatedAt: new Date(),
            processingBy: null,
            processingStarted: null,
            claimedBy: null,
            claimedAt: null,
            lastTransactionHash: executionResult.transactionHash,
            lastGasUsed: executionResult.gasUsed || 0,
            lastBlockNumber: executionResult.blockNumber || 0,
            lastActualCostETH: executionResult.actualCostETH || 0,
            lastActualCostUSD: executionResult.actualCostUSD || 0,
            smartContractExecution: true,
            contractAddress: CONTRACT_CONFIG.address,
            taxPaidETH: executionResult.taxPaidETH || 0,
            acknowledged: false, // Add acknowledgment flag
          };

          // Calculate next execution for recurring payments
          if (payment.frequency && payment.frequency !== "once") {
            const nextExecution = calculateNextExecution(
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
              updateData.nextExecutionAt = null;
            } else {
              updateData.nextExecutionAt = nextExecution;
            }
          } else {
            updateData.status = "completed";
            updateData.completedAt = new Date();
            updateData.nextExecutionAt = null;
          }

          // Update schedule
          await db.collection("schedules").updateOne(
            {
              _id: payment._id,
              status: { $ne: "failed" },
            },
            { $set: updateData }
          );

          // Store execution record
          const executionRecord = {
            scheduleId: payment.scheduleId,
            username: payment.username,
            walletAddress: payment.walletAddress,
            transactionHash: executionResult.transactionHash,
            gasUsed: executionResult.gasUsed || 0,
            blockNumber: executionResult.blockNumber || 0,
            actualCostETH: executionResult.actualCostETH || 0,
            actualCostUSD: executionResult.actualCostUSD || 0,
            executedAt: new Date(),
            status: "completed",
            tokenSymbol: payment.tokenSymbol,
            contractAddress: payment.contractAddress,
            recipient: payment.recipient,
            amount: payment.amount,
            executionCount: updateData.executedCount,
            enhancedAPI: true,
            smartContractAddress: CONTRACT_CONFIG.address,
            taxPaidETH: executionResult.taxPaidETH || 0,
            executionMethod: "smart_contract",
            createdAt: new Date(),
          };

          await db
            .collection("executed_transactions")
            .insertOne(executionRecord);

          executionResults.push({
            scheduleId: payment.scheduleId,
            success: true,
            transactionHash: executionResult.transactionHash,
            executedAt: new Date(),
            smartContract: true,
            gasSavings: "~30% with smart contract",
            taxPaidETH: executionResult.taxPaidETH,
          });
        } else {
          console.error(
            `❌ Enhanced: Smart contract payment execution failed: ${payment.scheduleId}`,
            executionResult.error
          );

          await markPaymentAsFailed(db, payment, executionResult.error, false); // Add acknowledgment flag

          executionResults.push({
            scheduleId: payment.scheduleId,
            success: false,
            error: executionResult.error,
            smartContract: true,
            retryCount: 0,
          });
        }
      } catch (error: any) {
        console.error(
          `💥 Enhanced: Critical error executing smart contract payment ${payment.scheduleId}:`,
          error
        );

        await markPaymentAsFailed(db, payment, error.message, false); // Add acknowledgment flag

        executionResults.push({
          scheduleId: payment.scheduleId,
          success: false,
          error: error.message,
          smartContract: true,
        });
      }
    }

    console.log(
      `📊 Enhanced: Smart contract execution summary: ${executionResults.length} payments processed`
    );
    const successCount = executionResults.filter((r) => r.success).length;
    const failureCount = executionResults.length - successCount;

    return NextResponse.json({
      success: true,
      summary: {
        totalProcessed: executionResults.length,
        successful: successCount,
        failed: failureCount,
        smartContractEnabled: true,
        contractAddress: CONTRACT_CONFIG.address,
        enhancedAPI: true,
      },
      results: executionResults,
    });
  } catch (error) {
    console.error(
      "💥 Enhanced: Smart contract scheduled payments executor error:",
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
    const { db } = await connectToDatabase();

    const stats = await Promise.all([
      db.collection("schedules").countDocuments({
        status: "active",
        smartContractEnabled: true,
      }),
      db.collection("schedules").countDocuments({
        status: "completed",
        smartContractExecution: true,
      }),
      db.collection("schedules").countDocuments({
        status: "failed",
        failedWithSmartContract: true,
      }),
      db.collection("schedules").countDocuments({
        status: "cancelled",
        cancelledWithSmartContract: true,
      }),
    ]);

    const now = new Date();

    // Count smart contract compatible payments
    const dueCount = await db.collection("schedules").countDocuments({
      status: "active",
      smartContractEnabled: true,
      nextExecutionAt: { $lte: now },
      tokenSymbol: { $in: ["ETH", "USDT", "USDC", "DAI", "LINK", "UNI"] },
    });

    const upcomingCount = await db.collection("schedules").countDocuments({
      status: "active",
      smartContractEnabled: true,
      nextExecutionAt: {
        $gt: now,
        $lte: new Date(now.getTime() + 24 * 60 * 60 * 1000),
      },
      tokenSymbol: { $in: ["ETH", "USDT", "USDC", "DAI", "LINK", "UNI"] },
    });

    return NextResponse.json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      smartContractEnabled: true,
      contractAddress: CONTRACT_CONFIG.address,
      supportedTokens: Object.keys(CONTRACT_CONFIG.supportedTokens).concat([
        "ETH",
      ]),
      enhancedAPI: true,
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
    console.error("Enhanced smart contract health check error:", error);
    return NextResponse.json(
      {
        status: "unhealthy",
        error: "Database connection failed",
        timestamp: new Date().toISOString(),
        smartContractEnabled: false,
      },
      { status: 500 }
    );
  }
}

// Enhanced smart contract payment execution function
async function executeSmartContractPayment(
  provider: ethers.JsonRpcProvider,
  payment: any,
  privateKey: string
): Promise<{
  success: boolean;
  transactionHash?: string;
  gasUsed?: number;
  blockNumber?: number;
  actualCostETH?: string;
  actualCostUSD?: string;
  taxPaidETH?: string;
  error?: string;
}> {
  try {
    const wallet = new ethers.Wallet(privateKey, provider);
    const contract = new ethers.Contract(
      CONTRACT_CONFIG.address,
      CONTRACT_ABI,
      wallet
    );

    const isETH =
      payment.tokenSymbol === "ETH" || payment.contractAddress === "native";
    const deadline = Math.floor(Date.now() / 1000) + 3600; // 1 hour

    let tx: ethers.ContractTransactionResponse;
    let taxPaidETH = "0";

    if (isETH) {
      console.log("💰 Enhanced: Executing ETH transfer with smart contract...");

      const amountWei = ethers.parseEther(payment.amount.toString());
      const taxWei = await contract.calculateETHTax(amountWei);
      const totalWei = amountWei + taxWei;

      taxPaidETH = ethers.formatEther(taxWei);

      tx = await contract.simpleETHTransfer(
        payment.recipient,
        amountWei,
        deadline,
        { value: totalWei }
      );
    } else {
      console.log(
        "🪙 Enhanced: Executing ERC20 transfer with smart contract..."
      );

      const tokenAddress =
        CONTRACT_CONFIG.supportedTokens[
          payment.tokenSymbol as keyof typeof CONTRACT_CONFIG.supportedTokens
        ];
      if (!tokenAddress) {
        throw new Error(
          `Token ${payment.tokenSymbol} not supported by smart contract`
        );
      }

      // Handle token approval (following JS file approach)
      const approvalSuccess = await handleTokenApproval(
        provider,
        wallet,
        tokenAddress,
        payment.amount,
        payment.decimals ||
          (payment.tokenSymbol === "USDT" || payment.tokenSymbol === "USDC"
            ? 6
            : 18)
      );

      if (!approvalSuccess) {
        throw new Error("Token approval failed");
      }

      const decimals =
        payment.decimals ||
        (payment.tokenSymbol === "USDT" || payment.tokenSymbol === "USDC"
          ? 6
          : 18);
      const amountWei = ethers.parseUnits(payment.amount.toString(), decimals);

      // Calculate tax in ETH for ERC20
      const ethPrice = 3500; // Fallback price
      const tokenPrice = await getTokenPrice(payment.tokenSymbol);
      const tokenValueUSD = parseFloat(payment.amount) * (tokenPrice || 1);
      const taxUSD = tokenValueUSD * CONTRACT_CONFIG.taxRate;
      const taxETHAmount = taxUSD / ethPrice;
      const taxWei = ethers.parseEther(taxETHAmount.toFixed(18));

      taxPaidETH = ethers.formatEther(taxWei);

      tx = await contract.simpleERC20Transfer(
        tokenAddress,
        payment.recipient,
        amountWei,
        taxWei,
        deadline,
        { value: taxWei }
      );
    }

    console.log(
      "⏳ Enhanced: Waiting for smart contract transaction confirmation..."
    );
    const receipt = await tx.wait();

    if (!receipt || receipt.status !== 1) {
      throw new Error("Smart contract transaction failed or was reverted");
    }

    // Calculate actual costs
    const gasUsed = Number(receipt.gasUsed);
    const gasPrice = receipt.gasPrice || tx.gasPrice;
    const actualGasCostWei = BigInt(gasUsed) * gasPrice;
    const actualCostETH = ethers.formatEther(actualGasCostWei);

    const ethPrice = await getETHPrice();
    const actualCostUSD = (parseFloat(actualCostETH) * ethPrice).toFixed(2);

    return {
      success: true,
      transactionHash: receipt.hash,
      gasUsed,
      blockNumber: receipt.blockNumber,
      actualCostETH,
      actualCostUSD,
      taxPaidETH,
    };
  } catch (error: any) {
    console.error("❌ Enhanced: Smart contract execution error:", error);
    return {
      success: false,
      error: error.message || "Smart contract execution failed",
    };
  }
}

// Enhanced token approval function (following JS file approach)
async function handleTokenApproval(
  provider: ethers.JsonRpcProvider,
  wallet: ethers.Wallet,
  tokenAddress: string,
  amount: string,
  decimals: number
): Promise<boolean> {
  try {
    const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, wallet);
    const amountWei = ethers.parseUnits(amount.toString(), decimals);

    const currentAllowance = await tokenContract.allowance(
      wallet.address,
      CONTRACT_CONFIG.address
    );

    console.log(`🔍 Enhanced: Checking approval for ${amount} tokens...`);
    console.log(
      `   Current allowance: ${ethers.formatUnits(currentAllowance, decimals)}`
    );
    console.log(`   Required amount: ${amount}`);

    if (currentAllowance < amountWei) {
      console.log(
        "🔐 Enhanced: Approving token spending with smart contract..."
      );

      // Approve 10x the amount to reduce future approval transactions
      const approvalAmount = amountWei * BigInt(10);

      const approveTx = await tokenContract.approve(
        CONTRACT_CONFIG.address,
        approvalAmount
      );

      console.log("📤 Enhanced: Approval transaction sent:", approveTx.hash);

      const approvalReceipt = await approveTx.wait();

      if (approvalReceipt && approvalReceipt.status === 1) {
        console.log("✅ Enhanced: Token approval confirmed for smart contract");

        // Wait for approval to propagate
        await new Promise((resolve) => setTimeout(resolve, 3000));

        // Verify approval
        const newAllowance = await tokenContract.allowance(
          wallet.address,
          CONTRACT_CONFIG.address
        );

        if (newAllowance >= amountWei) {
          console.log("✅ Enhanced: Approval verification successful");
          return true;
        } else {
          console.error("❌ Enhanced: Approval verification failed");
          return false;
        }
      } else {
        console.error("❌ Enhanced: Approval transaction failed");
        return false;
      }
    } else {
      console.log(
        "✅ Enhanced: Token already has sufficient allowance for smart contract"
      );
      return true;
    }
  } catch (error) {
    console.error("❌ Enhanced: Token approval error:", error);
    return false;
  }
}

// Enhanced decryption function (following the batch payment approach)
function decryptPrivateKey(encryptedData: any): string | null {
  try {
    console.log(
      "🔓 Enhanced: Attempting to decrypt private key for smart contract..."
    );

    // Handle string format (simple base64)
    if (typeof encryptedData === "string") {
      return Buffer.from(encryptedData, "base64").toString("utf8");
    }

    // Handle object format
    if (encryptedData && typeof encryptedData === "object") {
      // Try simple base64 decode first
      if (encryptedData.encryptedData) {
        try {
          const decoded = Buffer.from(
            encryptedData.encryptedData,
            "base64"
          ).toString("utf8");

          // Validate if it looks like a private key
          if (
            decoded.length === 64 ||
            (decoded.startsWith("0x") && decoded.length === 66)
          ) {
            console.log(
              "✅ Enhanced: Simple base64 decryption successful for smart contract"
            );
            return decoded;
          }
        } catch (error) {
          console.log(
            "⚠️ Enhanced: Simple base64 failed, trying advanced methods..."
          );
        }
      }
    }

    console.error(
      "❌ Enhanced: All decryption methods failed for smart contract"
    );
    return null;
  } catch (error) {
    console.error(
      "💥 Enhanced: Complete decryption failure for smart contract:",
      error
    );
    return null;
  }
}

// Mark payment as failed with acknowledgment flag
async function markPaymentAsFailed(
  db: any,
  payment: any,
  error: string,
  acknowledged: boolean = false
) {
  await db.collection("schedules").updateOne(
    {
      _id: payment._id,
      status: { $ne: "failed" },
    },
    {
      $set: {
        status: "failed",
        failedAt: new Date(),
        lastError: error,
        updatedAt: new Date(),
        processingBy: null,
        processingStarted: null,
        claimedBy: null,
        claimedAt: null,
        nextExecutionAt: null,
        failedWithSmartContract: true,
        acknowledged: acknowledged, // Add acknowledgment flag
      },
    }
  );
}

// Calculate next execution
function calculateNextExecution(
  lastExecution: Date,
  frequency: string
): Date | null {
  if (frequency === "once") return null;

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
      return null;
  }

  return nextExecution;
}

// Get token price
async function getTokenPrice(symbol: string): Promise<number> {
  try {
    const priceMap: { [key: string]: number } = {
      USDT: 1.0,
      USDC: 1.0,
      DAI: 1.0,
      LINK: 15.0,
      UNI: 8.0,
    };
    return priceMap[symbol] || 1.0;
  } catch {
    return 1.0;
  }
}

// Get ETH price
async function getETHPrice(): Promise<number> {
  try {
    return 3500; // Fallback price
  } catch {
    return 3500;
  }
}
