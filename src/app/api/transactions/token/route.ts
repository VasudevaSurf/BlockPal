// src/app/api/transactions/token/route.ts
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
    const contractAddress = searchParams.get("contractAddress");
    const walletAddress = searchParams.get("walletAddress");

    if (!contractAddress) {
      return NextResponse.json(
        { error: "Contract address is required" },
        { status: 400 }
      );
    }

    console.log("📡 Fetching token transactions:", {
      username: decoded.username,
      contractAddress,
      walletAddress,
    });

    const result = await transactionService.getTokenTransactions(
      decoded.username,
      contractAddress,
      walletAddress || undefined
    );

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({
      transactions: result.transactions,
    });
  } catch (error: any) {
    console.error("💥 Token transactions API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
