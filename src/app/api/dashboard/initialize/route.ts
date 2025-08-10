// src/app/api/dashboard/initialize/route.ts - Updated to use new workflow
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

    // Check if user is returning (has stored metadata)
    const existingData = await db.collection("dashboard_tokens").findOne({
      username: decoded.username,
      walletAddress: walletAddress.toLowerCase(),
    });

    const isReturningUser =
      existingData &&
      existingData.metadata &&
      Object.keys(existingData.metadata).length > 0;

    if (isReturningUser) {
      // PHASE 2: Returning user flow
      console.log(
        "👤 Returning user detected, loading dashboard with stored metadata"
      );

      try {
        // Step 1: Metadata already in DB
        const metadata = existingData.metadata;

        // Step 2 & 3: Get balances and prices
        const dashboardData = await dashboardServiceV2.loadReturningUser(
          walletAddress
        );

        // Update database with new values
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

        return NextResponse.json({
          isNewUser: false,
          tokens: dashboardData.tokens,
          totalValue: dashboardData.totalValue,
          metadata: metadata,
        });
      } catch (error) {
        console.error("⚠️ Error loading returning user data:", error);
        // Fall back to new user flow if there's an error
      }
    }

    // PHASE 1: New user flow
    console.log("🆕 New user detected, initializing with preset tokens");

    const initData = await dashboardServiceV2.initializeNewUser(walletAddress);

    // Store metadata in database
    const metadataObject: Record<string, any> = {};
    initData.metadata.forEach((meta) => {
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
          tokens: initData.tokens,
          totalValue: initData.totalValue,
          createdAt: new Date(),
          updatedAt: new Date(),
          lastRefreshed: new Date(),
        },
      },
      { upsert: true }
    );

    // Also store individual token metadata for global reference
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
