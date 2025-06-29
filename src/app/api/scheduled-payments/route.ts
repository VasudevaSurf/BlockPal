// src/app/api/scheduled-payments/route.ts - FIXED COLLECTION NAME AND ENHANCED API
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

    console.log("🔄 Enhanced Scheduled payments API request:", {
      action,
      tokenSymbol: tokenInfo?.symbol,
      frequency,
      useEnhancedAPI: true,
    });

    if (action === "preview") {
      // Create preview using enhanced API
      try {
        console.log("📊 Creating enhanced scheduled payment preview...");

        // Validate input
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

        console.log("✅ Enhanced scheduled payment preview created");

        return NextResponse.json({
          success: true,
          preview: {
            ...preview,
            enhancedAPI: true,
            gasSavings: "~30% lower gas fees with Enhanced API",
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
      // Create scheduled payment using enhanced API
      try {
        console.log("🚀 Creating enhanced scheduled payment...");

        // Validate input
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

        // Generate unique schedule ID
        const scheduleId = `sched_${Date.now()}_${Math.random()
          .toString(36)
          .substr(2, 9)}`;

        // Calculate next execution time
        const firstExecution = new Date(scheduledFor);
        const nextExecution =
          frequency === "once"
            ? null
            : enhancedScheduledPaymentsService.calculateNextExecution(
                firstExecution,
                frequency,
                timezone
              );

        // FIXED: Create scheduled payment document with correct field names
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
          nextExecutionAt: firstExecution, // FIXED: Use correct field name
          executionCount: 0,
          maxExecutions: frequency === "once" ? 1 : 100, // Default max for recurring
          description: description || "",
          timezone: timezone || "UTC",
          useEnhancedAPI: true, // Flag to use enhanced API
          createdAt: new Date(),
          lastExecutionAt: null,
          updatedAt: new Date(),
        };

        // FIXED: Save to correct collection name "schedules"
        const result = await db
          .collection("schedules")
          .insertOne(scheduledPayment);

        console.log(
          "✅ Enhanced scheduled payment created with ID:",
          scheduleId
        );

        return NextResponse.json({
          success: true,
          scheduleId,
          scheduledFor: firstExecution.toISOString(),
          nextExecution: firstExecution.toISOString(), // For one-time or first execution
          enhancedAPI: true,
          message:
            "Scheduled payment created with Enhanced API for better gas efficiency",
        });
      } catch (error: any) {
        console.error("❌ Enhanced scheduled payment creation error:", error);
        return NextResponse.json(
          { error: "Failed to create scheduled payment: " + error.message },
          { status: 500 }
        );
      }
    } else if (action === "execute") {
      // Execute a scheduled payment manually using enhanced API
      try {
        const { scheduleId, privateKey } = body;

        if (!scheduleId || !privateKey) {
          return NextResponse.json(
            { error: "Schedule ID and private key required for execution" },
            { status: 400 }
          );
        }

        const { db } = await connectToDatabase();

        // FIXED: Get the scheduled payment from correct collection
        const scheduledPayment = await db.collection("schedules").findOne({
          scheduleId,
          username: decoded.username,
          status: "active",
        });

        if (!scheduledPayment) {
          return NextResponse.json(
            { error: "Scheduled payment not found or not active" },
            { status: 404 }
          );
        }

        console.log(
          "🚀 Executing scheduled payment with Enhanced API:",
          scheduleId
        );

        // Execute using enhanced API
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
          // Update scheduled payment status
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
            { scheduleId },
            {
              $set: {
                executionCount,
                nextExecutionAt: nextExecution,
                status: newStatus,
                lastExecutionAt: new Date(),
                updatedAt: new Date(),
              },
              $push: {
                executionHistory: {
                  executedAt: new Date(),
                  transactionHash: executionResult.transactionHash,
                  gasUsed: executionResult.gasUsed,
                  actualCostETH: executionResult.actualCostETH,
                  actualCostUSD: executionResult.actualCostUSD,
                  enhancedAPI: true,
                },
              },
            }
          );

          console.log("✅ Enhanced scheduled payment executed successfully");

          return NextResponse.json({
            success: true,
            executionResult: {
              ...executionResult,
              enhancedAPI: true,
            },
            nextExecution: nextExecution?.toISOString() || null,
            newStatus,
          });
        } else {
          // Mark as failed
          await db.collection("schedules").updateOne(
            { scheduleId },
            {
              $set: {
                status: "failed",
                lastFailure: {
                  failedAt: new Date(),
                  error: executionResult.error,
                  enhancedAPI: true,
                },
                updatedAt: new Date(),
              },
            }
          );

          return NextResponse.json(
            {
              error: "Execution failed: " + executionResult.error,
              enhancedAPI: true,
            },
            { status: 500 }
          );
        }
      } catch (error: any) {
        console.error("❌ Enhanced scheduled payment execution error:", error);
        return NextResponse.json(
          {
            error: "Execution failed: " + error.message,
            enhancedAPI: true,
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

    // FIXED: Get scheduled payments from correct collection
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

    // Add enhanced API flag for display
    const enrichedPayments = scheduledPayments.map((payment) => ({
      ...payment,
      id: payment._id.toString(),
      enhancedAPI: payment.useEnhancedAPI || false,
      // FIXED: Map field names for frontend compatibility
      nextExecution: payment.nextExecutionAt,
    }));

    console.log(`✅ Retrieved ${enrichedPayments.length} scheduled payments`);

    return NextResponse.json({
      scheduledPayments: enrichedPayments,
      enhancedAPISupported: true,
    });
  } catch (error: any) {
    console.error("💥 Get scheduled payments error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
