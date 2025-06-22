// src/app/api/tokens/chart/route.ts
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
    const tokenId = searchParams.get("tokenId");
    const days = parseInt(searchParams.get("days") || "7");

    if (!tokenId) {
      return NextResponse.json({ error: "Token ID required" }, { status: 400 });
    }

    const chartData = await cryptoService.getPriceChart(tokenId, days);

    if (!chartData) {
      return NextResponse.json(
        { error: "Chart data not available" },
        { status: 404 }
      );
    }

    // Process chart data for easier frontend consumption
    const processedData = {
      prices:
        chartData.prices?.map((point: [number, number]) => ({
          timestamp: point[0],
          price: point[1],
          date: new Date(point[0]).toLocaleDateString(),
          time: new Date(point[0]).toLocaleTimeString(),
        })) || [],
      market_caps: chartData.market_caps || [],
      total_volumes: chartData.total_volumes || [],
      timeframe: days,
    };

    return NextResponse.json({
      chartData: processedData,
      metadata: {
        total_points: processedData.prices.length,
        timeframe_days: days,
        price_range:
          processedData.prices.length > 0
            ? {
                min: Math.min(...processedData.prices.map((p) => p.price)),
                max: Math.max(...processedData.prices.map((p) => p.price)),
                start: processedData.prices[0]?.price,
                end: processedData.prices[processedData.prices.length - 1]
                  ?.price,
              }
            : null,
      },
    });
  } catch (error) {
    console.error("Get price chart error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
