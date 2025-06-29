// src/app/api/transactions/route.ts
import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { transactionService } from "@/lib/transaction-service";

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get("auth-token")?.value;
    const decoded = verifyToken(token);

    if (!decoded) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");
    const status = searchParams.get("status");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");
    const walletAddress = searchParams.get("walletAddress");

    console.log("📡 Fetching transactions for user:", decoded.username, {
      type,
      status,
      limit,
      offset,
      walletAddress,
    });

    const result = await transactionService.getUserTransactions(
      decoded.username,
      {
        type: type || undefined,
        status: status || undefined,
        limit,
        offset,
        walletAddress: walletAddress || undefined,
      }
    );

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({
      transactions: result.transactions,
      total: result.total,
    });
  } catch (error: any) {
    console.error("💥 Transactions API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get("auth-token")?.value;
    const decoded = verifyToken(token);

    if (!decoded) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { action, transactionData, batchData } = body;

    console.log("📡 Transaction API request:", {
      action,
      username: decoded.username,
    });

    if (action === "save_simple") {
      const result = await transactionService.saveSimpleTransaction(
        transactionData,
        decoded.username
      );

      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        transactionId: result.transactionId,
      });
    } else if (action === "save_batch") {
      const result = await transactionService.saveBatchTransaction(
        batchData,
        decoded.username
      );

      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        transactionId: result.transactionId,
      });
    } else {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error: any) {
    console.error("💥 Transactions POST API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
