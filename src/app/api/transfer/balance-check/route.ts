// src/app/api/transfer/balance-check/route.ts
import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { enhancedFundRequestService } from "@/lib/enhanced-fund-request-service";

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get("auth-token")?.value;
    const decoded = verifyToken(token);

    if (!decoded) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { tokenInfo, walletAddress, amount } = await request.json();

    // Validate required fields
    if (!tokenInfo || !walletAddress || !amount) {
      return NextResponse.json(
        { error: "Missing required fields: tokenInfo, walletAddress, amount" },
        { status: 400 }
      );
    }

    // Validate wallet address format
    if (!enhancedFundRequestService.isValidAddress(walletAddress)) {
      return NextResponse.json(
        { error: "Invalid wallet address format" },
        { status: 400 }
      );
    }

    // Validate amount
    const amountNumber = parseFloat(amount);
    if (isNaN(amountNumber) || amountNumber <= 0) {
      return NextResponse.json(
        { error: "Invalid amount: must be a positive number" },
        { status: 400 }
      );
    }

    console.log("🔍 Balance check request:", {
      token: tokenInfo.symbol,
      contract: tokenInfo.contractAddress,
      amount,
      wallet: walletAddress.slice(0, 10) + "...",
    });

    // Check balance using the enhanced fund request service
    const balanceResult = await enhancedFundRequestService.checkBalance(
      {
        name: tokenInfo.name || tokenInfo.symbol,
        symbol: tokenInfo.symbol,
        contractAddress: tokenInfo.contractAddress || "native",
        decimals: tokenInfo.decimals || 18,
        isETH:
          tokenInfo.isETH ||
          tokenInfo.contractAddress === "native" ||
          tokenInfo.symbol === "ETH",
      },
      walletAddress,
      amount
    );

    console.log("✅ Balance check result:", {
      sufficient: balanceResult.sufficient,
      currentBalance: balanceResult.currentBalance,
      error: balanceResult.error,
    });

    return NextResponse.json({
      sufficient: balanceResult.sufficient,
      currentBalance: balanceResult.currentBalance,
      error: balanceResult.error,
      tokenInfo: {
        symbol: tokenInfo.symbol,
        name: tokenInfo.name,
        contractAddress: tokenInfo.contractAddress,
        decimals: tokenInfo.decimals,
        isETH: tokenInfo.isETH,
      },
      checkedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("💥 Balance check API error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error.message,
      },
      { status: 500 }
    );
  }
}
