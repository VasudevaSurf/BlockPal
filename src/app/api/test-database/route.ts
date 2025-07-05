// src/app/api/test-database/route.ts - TEST DATABASE CONTENTS
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

    console.log("🔍 DATABASE TEST: Checking scheduled payments collection...");

    // Get all scheduled payments for this user
    const allPayments = await db
      .collection("schedules")
      .find({ username: decoded.username })
      .toArray();

    console.log(
      `📊 Found ${allPayments.length} total payments for user: ${decoded.username}`
    );

    const paymentAnalysis = allPayments.map((payment, index) => ({
      index: index + 1,
      scheduleId: payment.scheduleId,
      status: payment.status,
      tokenSymbol: payment.tokenSymbol,
      amount: payment.amount,
      amountType: typeof payment.amount,
      recipient: payment.recipient,
      frequency: payment.frequency,
      scheduledFor: payment.scheduledFor,
      nextExecutionAt: payment.nextExecutionAt,
      useEnhancedAPI: payment.useEnhancedAPI,
      smartContractEnabled: payment.smartContractEnabled,
      smartContractAddress: payment.smartContractAddress,
      executionCount: payment.executionCount || 0,
      maxExecutions: payment.maxExecutions || 1,
      lastExecutionAt: payment.lastExecutionAt,
      processingBy: payment.processingBy,
      processingStarted: payment.processingStarted,
      createdAt: payment.createdAt,
      updatedAt: payment.updatedAt,
      failedAt: payment.failedAt,
      contractAddress: payment.contractAddress,
      decimals: payment.decimals,
    }));

    // Count by status
    const statusCounts = {
      active: allPayments.filter((p) => p.status === "active").length,
      completed: allPayments.filter((p) => p.status === "completed").length,
      failed: allPayments.filter((p) => p.status === "failed").length,
      cancelled: allPayments.filter((p) => p.status === "cancelled").length,
      processing: allPayments.filter((p) => p.status === "processing").length,
    };

    // Count by enhanced API
    const enhancedAPICounts = {
      useEnhancedAPI: allPayments.filter((p) => p.useEnhancedAPI === true)
        .length,
      smartContractEnabled: allPayments.filter(
        (p) => p.smartContractEnabled === true
      ).length,
      both: allPayments.filter(
        (p) => p.useEnhancedAPI === true && p.smartContractEnabled === true
      ).length,
    };

    // Count by token
    const tokenCounts = {};
    allPayments.forEach((p) => {
      const token = p.tokenSymbol || "unknown";
      tokenCounts[token] = (tokenCounts[token] || 0) + 1;
    });

    // Check timing
    const now = new Date();
    const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);

    const timingAnalysis = {
      dueNow: allPayments.filter((p) => {
        const nextExec = p.nextExecutionAt
          ? new Date(p.nextExecutionAt)
          : new Date(p.scheduledFor);
        return nextExec <= now;
      }).length,
      dueSoon: allPayments.filter((p) => {
        const nextExec = p.nextExecutionAt
          ? new Date(p.nextExecutionAt)
          : new Date(p.scheduledFor);
        return nextExec <= fiveMinutesFromNow && nextExec > now;
      }).length,
      dueInFuture: allPayments.filter((p) => {
        const nextExec = p.nextExecutionAt
          ? new Date(p.nextExecutionAt)
          : new Date(p.scheduledFor);
        return nextExec > fiveMinutesFromNow;
      }).length,
    };

    // Check for potential issues
    const issues = [];

    allPayments.forEach((payment) => {
      if (payment.status === "active") {
        if (!payment.useEnhancedAPI && !payment.smartContractEnabled) {
          issues.push(
            `Payment ${payment.scheduleId}: Active but missing enhanced API flags`
          );
        }
        if (typeof payment.amount === "number" && payment.amount < 1e-6) {
          issues.push(
            `Payment ${payment.scheduleId}: Very small amount might cause string conversion issues`
          );
        }
        if (!payment.nextExecutionAt && !payment.scheduledFor) {
          issues.push(`Payment ${payment.scheduleId}: No execution time set`);
        }
        if (payment.tokenSymbol === "ETH" && !payment.contractAddress) {
          issues.push(
            `Payment ${payment.scheduleId}: ETH payment missing contract address (should be 'native')`
          );
        }
      }
    });

    console.log("📊 DATABASE TEST SUMMARY:");
    console.log("  Status counts:", statusCounts);
    console.log("  Enhanced API counts:", enhancedAPICounts);
    console.log("  Token counts:", tokenCounts);
    console.log("  Timing analysis:", timingAnalysis);
    console.log("  Issues found:", issues.length);

    return NextResponse.json({
      success: true,
      summary: {
        totalPayments: allPayments.length,
        username: decoded.username,
        statusCounts,
        enhancedAPICounts,
        tokenCounts,
        timingAnalysis,
        issuesFound: issues.length,
        currentTime: now.toISOString(),
      },
      payments: paymentAnalysis,
      issues: issues,
      debug: {
        databaseChecked: true,
        collectionName: "schedules",
        userFilter: { username: decoded.username },
      },
    });
  } catch (error) {
    console.error("💥 DATABASE TEST ERROR:", error);
    return NextResponse.json(
      { error: "Database test failed: " + error.message },
      { status: 500 }
    );
  }
}
