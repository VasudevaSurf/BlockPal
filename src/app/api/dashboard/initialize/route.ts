import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import { dashboardService } from "@/lib/dashboard-service";

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

    console.log(`🚀 Initializing dashboard for wallet: ${walletAddress}`);

    const { db } = await connectToDatabase();

    // Check if user already has dashboard data for this wallet
    const existingData = await db.collection("dashboard_tokens").findOne({
      username: decoded.username,
      walletAddress: walletAddress.toLowerCase(),
    });

    if (
      existingData &&
      existingData.metadata &&
      existingData.metadata.length > 0
    ) {
      console.log(
        "📊 Returning user detected, using stored metadata and refreshing"
      );

      // For returning users, use stored metadata and refresh prices
      const metadata = existingData.metadata || [];

      try {
        const refreshedData = await dashboardService.refreshDashboard(
          walletAddress,
          metadata
        );

        // Update last refresh time
        await db.collection("dashboard_tokens").updateOne(
          {
            username: decoded.username,
            walletAddress: walletAddress.toLowerCase(),
          },
          {
            $set: {
              lastRefreshed: new Date(),
              tokens: refreshedData.tokens,
              totalValue: refreshedData.totalValue,
            },
          }
        );

        return NextResponse.json({
          isNewUser: false,
          tokens: refreshedData.tokens,
          totalValue: refreshedData.totalValue,
          metadata,
        });
      } catch (refreshError) {
        console.error(
          "⚠️ Refresh failed, returning cached data:",
          refreshError
        );
        // If refresh fails, return cached data
        return NextResponse.json({
          isNewUser: false,
          tokens: existingData.tokens || [],
          totalValue: existingData.totalValue || 0,
          metadata,
        });
      }
    }

    // New user - initialize dashboard with preset tokens
    console.log("🆕 New user detected, initializing with preset tokens");

    const initData = await dashboardService.initializeNewUser(walletAddress);

    // Store metadata and initial data in database
    await db.collection("dashboard_tokens").updateOne(
      {
        username: decoded.username,
        walletAddress: walletAddress.toLowerCase(),
      },
      {
        $set: {
          username: decoded.username,
          walletAddress: walletAddress.toLowerCase(),
          metadata: initData.metadata,
          tokens: initData.tokens,
          totalValue: initData.totalValue,
          createdAt: new Date(),
          updatedAt: new Date(),
          lastRefreshed: new Date(),
        },
      },
      { upsert: true }
    );

    // Store global token metadata for future use
    for (const meta of initData.metadata) {
      if (meta.contractAddress !== "native") {
        await db.collection("token_metadata").updateOne(
          { contractAddress: meta.contractAddress.toLowerCase() },
          {
            $set: {
              ...meta,
              contractAddress: meta.contractAddress.toLowerCase(),
              updatedAt: new Date(),
            },
          },
          { upsert: true }
        );
      }
    }

    return NextResponse.json({
      isNewUser: true,
      tokens: initData.tokens,
      totalValue: initData.totalValue,
      metadata: initData.metadata,
    });
  } catch (error) {
    console.error("❌ Dashboard initialization error:", error);
    return NextResponse.json(
      { error: "Failed to initialize dashboard" },
      { status: 500 }
    );
  }
}
