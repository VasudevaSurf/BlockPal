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
    const contractAddress = searchParams.get("contract");

    if (!contractAddress) {
      return NextResponse.json(
        { error: "Contract address required" },
        { status: 400 }
      );
    }

    console.log("📡 Fetching token price for:", contractAddress);

    // Get token price by contract
    const priceData = await cryptoService.getTokenPriceByContract(
      contractAddress
    );

    if (!priceData) {
      return NextResponse.json(
        { error: "Price data not available" },
        { status: 404 }
      );
    }

    const result = {
      contractAddress,
      current_price: priceData.current_price,
      price_change_percentage_24h: priceData.price_change_percentage_24h,
      market_cap: priceData.market_cap,
      total_volume: priceData.total_volume,
      timestamp: new Date().toISOString(),
    };

    console.log("✅ Token price fetched:", {
      contract: contractAddress.slice(0, 8) + "...",
      price: result.current_price,
      change24h: result.price_change_percentage_24h,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("❌ Error fetching token price:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch token price",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
