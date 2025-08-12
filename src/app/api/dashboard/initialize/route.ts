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

    // Check if user has data in MongoDB
    const existingData = await db.collection("dashboard_tokens").findOne({
      username: decoded.username,
      walletAddress: walletAddress.toLowerCase(),
    });

    // CRITICAL: Sync MongoDB data to localStorage if exists
    if (
      existingData &&
      existingData.metadata &&
      Object.keys(existingData.metadata).length > 0
    ) {
      console.log("📂 Found MongoDB data, syncing to localStorage");

      // Extract displayedTokens from MongoDB
      let displayedTokens = existingData.displayedTokens || [];

      // If no displayedTokens but has metadata, create from metadata keys
      if (displayedTokens.length === 0 && existingData.metadata) {
        displayedTokens = Object.keys(existingData.metadata);
      }

      // Sync to dashboard service cache
      const userData = {
        walletAddress: walletAddress.toLowerCase(),
        metadata: existingData.metadata,
        displayedTokens: displayedTokens,
        lastUpdated: existingData.updatedAt || new Date().toISOString(),
      };

      // Force update the service cache
      dashboardServiceV2["userDataCache"].set(
        walletAddress.toLowerCase(),
        userData
      );
      dashboardServiceV2["saveUserDataToStorage"]();

      console.log(
        `✅ Synced ${displayedTokens.length} tokens from MongoDB to localStorage`
      );
    }

    // Now check if returning user (after sync)
    const isReturningUser = dashboardServiceV2.isReturningUser(walletAddress);

    let dashboardData;

    if (isReturningUser) {
      // PHASE 2: Returning user
      console.log("👤 Returning user detected, loading with stored metadata");
      dashboardData = await dashboardServiceV2.loadReturningUser(walletAddress);
    } else {
      // PHASE 1: New user
      console.log("🆕 New user detected, initializing with preset tokens");
      dashboardData = await dashboardServiceV2.initializeNewUser(walletAddress);

      // Store metadata in MongoDB for new user
      if (dashboardData.metadata && dashboardData.metadata.length > 0) {
        const metadataObject: Record<string, any> = {};
        const displayedTokens: string[] = [];

        dashboardData.metadata.forEach((meta: any) => {
          const key =
            meta.contractAddress === "native"
              ? "native"
              : meta.contractAddress.toLowerCase();
          metadataObject[key] = meta;
          displayedTokens.push(key);
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
              displayedTokens: displayedTokens,
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

    // Update MongoDB with current state
    if (dashboardData.tokens && dashboardData.tokens.length > 0) {
      // Get current displayedTokens from service
      const serviceData = dashboardServiceV2["userDataCache"].get(
        walletAddress.toLowerCase()
      );
      const displayedTokens =
        serviceData?.displayedTokens ||
        dashboardData.tokens.map((t: any) =>
          t.contractAddress === "native"
            ? "native"
            : t.contractAddress.toLowerCase()
        );

      await db.collection("dashboard_tokens").updateOne(
        {
          username: decoded.username,
          walletAddress: walletAddress.toLowerCase(),
        },
        {
          $set: {
            tokens: dashboardData.tokens,
            displayedTokens: displayedTokens,
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
