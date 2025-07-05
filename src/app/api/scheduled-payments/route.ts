// src/app/api/scheduled-payments/route.ts - UPDATED WITH SMART CONTRACT INTEGRATION
import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import { enhancedScheduledPaymentsService } from "@/lib/enhanced-scheduled-payments-service";

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get("auth-token")?.value;
    const decoded = verifyToken(token);

    if (!decoded) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      action,
      tokenInfo,
      fromAddress,
      recipient,
      amount,
      scheduledFor,
      frequency,
      timezone,
      description,
    } = body;

    console.log(
      "🔄 Enhanced Scheduled payments API request with smart contract:",
      {
        action,
        tokenSymbol: tokenInfo?.symbol,
        frequency,
        useEnhancedAPI: true,
        smartContract: true,
      }
    );

    if (action === "preview") {
      try {
        console.log(
          "📊 Creating enhanced scheduled payment preview with smart contract..."
        );

        const validation =
          enhancedScheduledPaymentsService.validateScheduledPayment(
            tokenInfo,
            recipient,
            amount,
            new Date(scheduledFor),
            frequency
          );

        if (!validation.valid) {
          return NextResponse.json(
            { error: validation.error },
            { status: 400 }
          );
        }

        const preview =
          await enhancedScheduledPaymentsService.createScheduledPaymentPreview(
            tokenInfo,
            fromAddress,
            recipient,
            amount,
            new Date(scheduledFor),
            frequency,
            timezone
          );

        console.log(
          "✅ Enhanced scheduled payment preview created with smart contract"
        );

        return NextResponse.json({
          success: true,
          preview: {
            ...preview,
            enhancedAPI: true,
            smartContract: true,
            gasSavings: "~30% lower gas fees with Smart Contract",
            taxInfo: {
              taxETH: preview.taxETH,
              taxUSD: preview.taxUSD,
              taxRate: "0.5%",
            },
          },
        });
      } catch (error: any) {
        console.error("❌ Enhanced preview creation error:", error);
        return NextResponse.json(
          { error: "Failed to create preview: " + error.message },
          { status: 500 }
        );
      }
    } else if (action === "create") {
      try {
        console.log(
          "🚀 Creating enhanced scheduled payment with smart contract..."
        );

        const validation =
          enhancedScheduledPaymentsService.validateScheduledPayment(
            tokenInfo,
            recipient,
            amount,
            new Date(scheduledFor),
            frequency
          );

        if (!validation.valid) {
          return NextResponse.json(
            { error: validation.error },
            { status: 400 }
          );
        }

        const { db } = await connectToDatabase();

        const scheduleId = `sched_${Date.now()}_${Math.random()
          .toString(36)
          .substr(2, 9)}`;

        const firstExecution = new Date(scheduledFor);
        const nextExecution =
          frequency === "once"
            ? null
            : enhancedScheduledPaymentsService.calculateNextExecution(
                firstExecution,
                frequency,
                timezone
              );

        const scheduledPayment = {
          scheduleId,
          username: decoded.username,
          walletAddress: fromAddress,
          tokenSymbol: tokenInfo.symbol,
          tokenName: tokenInfo.name,
          contractAddress: tokenInfo.contractAddress,
          decimals: tokenInfo.decimals || 18,
          recipient,
          amount,
          frequency,
          status: "active",
          scheduledFor: firstExecution,
          nextExecutionAt: firstExecution,
          executionCount: 0,
          maxExecutions: frequency === "once" ? 1 : 100,
          description: description || "",
          timezone: timezone || "UTC",
          useEnhancedAPI: true,
          smartContractEnabled: true,
          contractAddress: "0x9e4f241e8500eef9a1db6906c47401c8a0f04564",
          createdAt: new Date(),
          lastExecutionAt: null,
          updatedAt: new Date(),
          failedAt: null,
          lastError: null,
          processingBy: null,
          processingStarted: null,
          claimedBy: null,
          claimedAt: null,
        };

        const result = await db
          .collection("schedules")
          .insertOne(scheduledPayment);

        console.log(
          "✅ Enhanced scheduled payment created with smart contract, ID:",
          scheduleId
        );

        return NextResponse.json({
          success: true,
          scheduleId,
          scheduledFor: firstExecution.toISOString(),
          nextExecution: firstExecution.toISOString(),
          enhancedAPI: true,
          smartContract: true,
          contractAddress: "0x9e4f241e8500eef9a1db6906c47401c8a0f04564",
          message:
            "Scheduled payment created with Smart Contract for optimal gas efficiency and automatic tax handling",
        });
      } catch (error: any) {
        console.error("❌ Enhanced scheduled payment creation error:", error);
        return NextResponse.json(
          { error: "Failed to create scheduled payment: " + error.message },
          { status: 500 }
        );
      }
    } else if (action === "execute") {
      try {
        const { scheduleId, privateKey } = body;

        if (!scheduleId || !privateKey) {
          return NextResponse.json(
            { error: "Schedule ID and private key required for execution" },
            { status: 400 }
          );
        }

        const { db } = await connectToDatabase();

        const scheduledPayment = await db.collection("schedules").findOne({
          scheduleId,
          username: decoded.username,
        });

        if (!scheduledPayment) {
          return NextResponse.json(
            { error: "Scheduled payment not found" },
            { status: 404 }
          );
        }

        if (scheduledPayment.status === "failed") {
          return NextResponse.json(
            { error: "Cannot execute a permanently failed payment" },
            { status: 400 }
          );
        }

        if (scheduledPayment.status !== "active") {
          return NextResponse.json(
            {
              error: `Cannot execute payment with status: ${scheduledPayment.status}`,
            },
            { status: 400 }
          );
        }

        console.log(
          "🚀 Executing scheduled payment with smart contract:",
          scheduleId
        );

        const executionResult =
          await enhancedScheduledPaymentsService.executeScheduledPayment(
            {
              name: scheduledPayment.tokenName,
              symbol: scheduledPayment.tokenSymbol,
              contractAddress: scheduledPayment.contractAddress,
              decimals: scheduledPayment.decimals || 18,
              isETH:
                scheduledPayment.contractAddress === "native" ||
                scheduledPayment.tokenSymbol === "ETH",
            },
            scheduledPayment.walletAddress,
            scheduledPayment.recipient,
            scheduledPayment.amount,
            privateKey
          );

        if (executionResult.success) {
          const executionCount = (scheduledPayment.executionCount || 0) + 1;
          const nextExecution =
            enhancedScheduledPaymentsService.calculateNextExecution(
              new Date(),
              scheduledPayment.frequency,
              scheduledPayment.timezone
            );

          const newStatus = enhancedScheduledPaymentsService.getPaymentStatus(
            executionCount,
            scheduledPayment.maxExecutions,
            scheduledPayment.frequency,
            nextExecution
          );

          await db.collection("schedules").updateOne(
            {
              scheduleId,
              status: { $ne: "failed" },
            },
            {
              $set: {
                executionCount,
                nextExecutionAt: nextExecution,
                status: newStatus,
                lastExecutionAt: new Date(),
                updatedAt: new Date(),
                processingBy: null,
                processingStarted: null,
                claimedBy: null,
                claimedAt: null,
                lastTransactionHash: executionResult.transactionHash,
                lastExecutedWithSmartContract: true,
              },
              $push: {
                executionHistory: {
                  executedAt: new Date(),
                  transactionHash: executionResult.transactionHash,
                  gasUsed: executionResult.gasUsed,
                  actualCostETH: executionResult.actualCostETH,
                  actualCostUSD: executionResult.actualCostUSD,
                  enhancedAPI: true,
                  smartContract: true,
                },
              },
            }
          );

          console.log(
            "✅ Enhanced scheduled payment executed successfully with smart contract"
          );

          return NextResponse.json({
            success: true,
            executionResult: {
              ...executionResult,
              enhancedAPI: true,
              smartContract: true,
            },
            nextExecution: nextExecution?.toISOString() || null,
            newStatus,
          });
        } else {
          await db.collection("schedules").updateOne(
            {
              scheduleId,
              status: { $ne: "failed" },
            },
            {
              $set: {
                status: "failed",
                failedAt: new Date(),
                lastError: executionResult.error,
                updatedAt: new Date(),
                processingBy: null,
                processingStarted: null,
                claimedBy: null,
                claimedAt: null,
                nextExecutionAt: null,
                failedWithSmartContract: true,
              },
            }
          );

          return NextResponse.json(
            {
              error: "Execution failed: " + executionResult.error,
              enhancedAPI: true,
              smartContract: true,
            },
            { status: 500 }
          );
        }
      } catch (error: any) {
        console.error("❌ Enhanced scheduled payment execution error:", error);

        const { scheduleId } = body;
        if (scheduleId) {
          const { db } = await connectToDatabase();
          await db.collection("schedules").updateOne(
            {
              scheduleId,
              status: { $ne: "failed" },
            },
            {
              $set: {
                status: "failed",
                failedAt: new Date(),
                lastError: error.message,
                updatedAt: new Date(),
                processingBy: null,
                processingStarted: null,
                claimedBy: null,
                claimedAt: null,
                nextExecutionAt: null,
                failedWithSmartContract: true,
              },
            }
          );
        }

        return NextResponse.json(
          {
            error: "Execution failed: " + error.message,
            enhancedAPI: true,
            smartContract: true,
          },
          { status: 500 }
        );
      }
    } else {
      return NextResponse.json(
        { error: "Invalid action. Must be 'preview', 'create', or 'execute'" },
        { status: 400 }
      );
    }
  } catch (error: any) {
    console.error("💥 Enhanced Scheduled payments API error:", error);
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

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "active";
    const walletAddress = searchParams.get("walletAddress");

    if (!walletAddress) {
      return NextResponse.json(
        { error: "Wallet address required" },
        { status: 400 }
      );
    }

    const { db } = await connectToDatabase();

    const query: any = {
      username: decoded.username,
      walletAddress,
    };

    if (status !== "all") {
      query.status = status;
    }

    const scheduledPayments = await db
      .collection("schedules")
      .find(query)
      .sort({ createdAt: -1 })
      .limit(100)
      .toArray();

    const enrichedPayments = scheduledPayments.map((payment) => ({
      ...payment,
      id: payment._id.toString(),
      enhancedAPI: payment.useEnhancedAPI || false,
      smartContract: payment.smartContractEnabled || false,
      nextExecution: payment.nextExecutionAt,
      isFailed: payment.status === "failed",
      failureReason: payment.lastError || null,
      failedAt: payment.failedAt || null,
      contractAddress:
        payment.contractAddress || "0x9e4f241e8500eef9a1db6906c47401c8a0f04564",
    }));

    console.log(
      `✅ Retrieved ${enrichedPayments.length} scheduled payments with smart contract info`
    );

    return NextResponse.json({
      scheduledPayments: enrichedPayments,
      enhancedAPISupported: true,
      smartContractEnabled: true,
      contractAddress: "0x9e4f241e8500eef9a1db6906c47401c8a0f04564",
    });
  } catch (error: any) {
    console.error("💥 Get scheduled payments error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
