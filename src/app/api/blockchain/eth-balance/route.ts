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

    console.log("📡 Fetching ETH balance directly from blockchain:", address);

    // Get ETH balance directly from blockchain
    const balanceFormatted = await cryptoService.getETHBalance(address);
    const balanceWei = (parseFloat(balanceFormatted) * 1e18).toString();

    // Get ETH price
    const ethPriceData = await cryptoService.getTokenPrice("ethereum");
    const priceUSD = ethPriceData?.current_price || 0;

    const result = {
      address,
      formatted: balanceFormatted,
      wei: balanceWei,
      priceUSD,
      valueUSD: parseFloat(balanceFormatted) * priceUSD,
      change24h: ethPriceData?.price_change_percentage_24h || 0,
      timestamp: new Date().toISOString(),
    };

    console.log("✅ ETH balance fetched:", {
      address: address.slice(0, 8) + "...",
      balance: balanceFormatted,
      valueUSD: result.valueUSD.toFixed(2),
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("❌ Error fetching ETH balance:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch ETH balance",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
