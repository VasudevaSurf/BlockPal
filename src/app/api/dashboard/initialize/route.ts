// src/app/api/dashboard/initialize/route.ts - FIXED VERSION
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

    console.log(`🚀 Initializing dashboard for wallet: ${walletAddress}`);

    const { db } = await connectToDatabase();

    // Check if user is returning
    const existingData = await db.collection("dashboard_tokens").findOne({
      username: decoded.username,
      walletAddress: walletAddress.toLowerCase(),
    });

    const isReturningUser = dashboardServiceV2.isReturningUser(walletAddress);

    let dashboardData;

    if (
      isReturningUser ||
      (existingData &&
        existingData.metadata &&
        Object.keys(existingData.metadata).length > 0)
    ) {
      // PHASE 2: Returning user
      console.log("👤 Returning user detected, loading with stored metadata");
      dashboardData = await dashboardServiceV2.loadReturningUser(walletAddress);
    } else {
      // PHASE 1: New user
      console.log("🆕 New user detected, initializing with preset tokens");
      dashboardData = await dashboardServiceV2.initializeNewUser(walletAddress);

      // Store metadata in MongoDB
      if (dashboardData.metadata) {
        const metadataObject: Record<string, any> = {};
        dashboardData.metadata.forEach((meta: any) => {
          metadataObject[meta.contractAddress.toLowerCase()] = meta;
        });

        await db.collection("dashboard_tokens").updateOne(
          {
            username: decoded.username,
            walletAddress: walletAddress.toLowerCase(),
          },
          {
            $set: {
              username: decoded.username,
              walletAddress: walletAddress.toLowerCase(),
              metadata: metadataObject,
              tokens: dashboardData.tokens,
              totalValue: dashboardData.totalValue,
              isNewUser: dashboardData.isNewUser,
              createdAt: new Date(),
              updatedAt: new Date(),
              lastRefreshed: new Date(),
            },
          },
          { upsert: true }
        );
      }
    }

    // Update with fresh data
    if (dashboardData.tokens && dashboardData.tokens.length > 0) {
      await db.collection("dashboard_tokens").updateOne(
        {
          username: decoded.username,
          walletAddress: walletAddress.toLowerCase(),
        },
        {
          $set: {
            tokens: dashboardData.tokens,
            totalValue: dashboardData.totalValue,
            lastRefreshed: new Date(),
            updatedAt: new Date(),
          },
        }
      );
    }

    console.log(
      `✅ Dashboard initialized: ${
        dashboardData.tokens?.length || 0
      } tokens, $${dashboardData.totalValue?.toFixed(2) || 0}`
    );

    return NextResponse.json({
      isNewUser: dashboardData.isNewUser || false,
      tokens: dashboardData.tokens || [],
      totalValue: dashboardData.totalValue || 0,
      metadata: dashboardData.metadata || [],
    });
  } catch (error) {
    console.error("❌ Dashboard initialization error:", error);
    return NextResponse.json(
      {
        error: "Failed to initialize dashboard",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
