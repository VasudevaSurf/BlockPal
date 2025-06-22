import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { verifyToken } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get("auth-token")?.value;
    const decoded = verifyToken(token);

    if (!decoded) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const walletAddress = searchParams.get("walletAddress");

    if (!walletAddress) {
      return NextResponse.json(
        { error: "Wallet address required" },
        { status: 400 }
      );
    }

    const { db } = await connectToDatabase();

    // Get wallet from database
    const wallet = await db.collection("wallets").findOne({
      walletAddress,
      username: decoded.username,
    });

    if (!wallet) {
      return NextResponse.json({ error: "Wallet not found" }, { status: 404 });
    }

    // For now, return a default balance
    // In a real implementation, you would:
    // 1. Connect to blockchain RPC
    // 2. Get actual ETH/token balances
    // 3. Calculate USD value using price APIs

    const balance = 0; // Default balance

    // You could also get balance from wallet_tokens collection
    const walletTokens = await db
      .collection("wallet_tokens")
      .find({
        walletAddress,
        username: decoded.username,
      })
      .toArray();

    // Calculate total USD value from tokens
    let totalValue = 0;
    for (const token of walletTokens) {
      totalValue +=
        parseFloat(token.balanceFormatted || "0") * (token.priceUSD || 0);
    }

    return NextResponse.json({
      balance: totalValue,
      currency: "USD",
      lastUpdated: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Get wallet balance error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
