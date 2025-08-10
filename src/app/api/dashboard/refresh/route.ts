// src/app/api/dashboard/refresh/route.ts - Updated for automatic refresh workflow
import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import { dashboardServiceV2 } from "@/lib/dashboard-service-v2";

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get("auth-token")?.value;
    const decoded = verifyToken(token);

    if (!decoded) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { walletAddress } = await request.json();

    if (!walletAddress) {
      return NextResponse.json(
        { error: "Wallet address required" },
        { status: 400 }
      );
    }

    console.log(`🔄 Refreshing dashboard for wallet: ${walletAddress}`);

    const { db } = await connectToDatabase();

    // Get stored metadata
    const dashboardData = await db.collection("dashboard_tokens").findOne({
      username: decoded.username,
      walletAddress: walletAddress.toLowerCase(),
    });

    if (!dashboardData || !dashboardData.metadata) {
      return NextResponse.json(
        { error: "Dashboard not initialized. Please initialize first." },
        { status: 400 }
      );
    }

    // AUTOMATIC REFRESH FLOW:
    // Step 1: Get updated token balances from Alchemy
    // Step 2: Batch fetch current prices from CoinGecko
    // No need to update metadata
    const refreshedData = await dashboardServiceV2.refreshDashboard(
      walletAddress
    );

    // Update database with refreshed values (not metadata)
    await db.collection("dashboard_tokens").updateOne(
      {
        username: decoded.username,
        walletAddress: walletAddress.toLowerCase(),
      },
      {
        $set: {
          tokens: refreshedData.tokens,
          totalValue: refreshedData.totalValue,
          lastRefreshed: new Date(),
          updatedAt: new Date(),
        },
      }
    );

    console.log(`✅ Dashboard refreshed successfully`);

    return NextResponse.json({
      tokens: refreshedData.tokens,
      totalValue: refreshedData.totalValue,
      timestamp: new Date(),
    });
  } catch (error) {
    console.error("❌ Dashboard refresh error:", error);
    return NextResponse.json(
      { error: "Failed to refresh dashboard" },
      { status: 500 }
    );
  }
}
