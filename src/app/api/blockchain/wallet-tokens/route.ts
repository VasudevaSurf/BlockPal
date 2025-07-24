import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { cryptoService } from "@/lib/crypto-integration";

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get("auth-token")?.value;
    const decoded = verifyToken(token);

    if (!decoded) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const address = searchParams.get("address");

    if (!address || !cryptoService.isValidAddress(address)) {
      return NextResponse.json(
        { error: "Invalid wallet address" },
        { status: 400 }
      );
    }

    console.log("📡 Fetching wallet tokens directly from blockchain:", address);

    // Get tokens directly from blockchain
    const tokensData = await cryptoService.getWalletTokens(address);

    // Transform to consistent format
    const tokens = tokensData.map((token, index) => ({
      id: token.contractAddress || `token-${index}`,
      symbol: token.symbol || "UNKNOWN",
      name: token.name || "Unknown Token",
      balance: parseFloat(token.balanceFormatted || "0"),
      balanceRaw: token.tokenBalance || "0",
      value: token.valueUSD || 0,
      price: token.priceUSD || 0,
      change24h: token.change24h || 0,
      logoUrl: token.logoUrl || null,
      contractAddress: token.contractAddress,
      decimals: token.decimals || 18,
    }));

    const result = {
      address,
      tokens,
      tokenCount: tokens.length,
      totalValue: tokens.reduce((sum, token) => sum + token.value, 0),
      timestamp: new Date().toISOString(),
    };

    console.log("✅ Wallet tokens fetched:", {
      address: address.slice(0, 8) + "...",
      tokenCount: tokens.length,
      totalValue: result.totalValue.toFixed(2),
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("❌ Error fetching wallet tokens:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch wallet tokens",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
