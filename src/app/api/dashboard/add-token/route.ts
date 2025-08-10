// src/app/api/dashboard/add-token/route.ts - Updated for Phase 3 workflow
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

    const { contractAddress, walletAddress } = await request.json();

    if (!contractAddress || !walletAddress) {
      return NextResponse.json(
        { error: "Contract address and wallet address required" },
        { status: 400 }
      );
    }

    // Normalize addresses
    const normalizedContract = contractAddress.toLowerCase();
    const normalizedWallet = walletAddress.toLowerCase();

    console.log(`➕ Adding token ${normalizedContract} to dashboard`);

    const { db } = await connectToDatabase();

    // Get existing dashboard data
    const dashboardData = await db.collection("dashboard_tokens").findOne({
      username: decoded.username,
      walletAddress: normalizedWallet,
    });

    if (!dashboardData) {
      return NextResponse.json(
        { error: "Dashboard not initialized" },
        { status: 400 }
      );
    }

    // Check if token already exists
    if (dashboardData.metadata && dashboardData.metadata[normalizedContract]) {
      return NextResponse.json(
        { error: "Token already in dashboard" },
        { status: 400 }
      );
    }

    // PHASE 3: Add token workflow
    // 1. Get metadata (CoinGecko first, Alchemy as fallback)
    // 2. Get token balance
    // 3. Batch fetch price with existing tokens
    const { token: newToken, metadata } =
      await dashboardServiceV2.addTokenToDashboard(
        contractAddress,
        walletAddress
      );

    // Update metadata in database
    const updatedMetadata = {
      ...(dashboardData.metadata || {}),
      [normalizedContract]: metadata,
    };

    // Add new token to existing tokens
    const updatedTokens = [...(dashboardData.tokens || []), newToken];
    const updatedTotalValue = (dashboardData.totalValue || 0) + newToken.value;

    await db.collection("dashboard_tokens").updateOne(
      {
        username: decoded.username,
        walletAddress: normalizedWallet,
      },
      {
        $set: {
          metadata: updatedMetadata,
          tokens: updatedTokens,
          totalValue: updatedTotalValue,
          updatedAt: new Date(),
        },
      }
    );

    // Store in global metadata collection
    await db.collection("token_metadata").updateOne(
      { contractAddress: normalizedContract },
      {
        $set: {
          ...metadata,
          contractAddress: normalizedContract,
          updatedAt: new Date(),
        },
      },
      { upsert: true }
    );

    console.log(`✅ Token added successfully: ${metadata.symbol}`);

    return NextResponse.json({
      success: true,
      token: newToken,
      metadata,
    });
  } catch (error) {
    console.error("❌ Add token error:", error);
    return NextResponse.json({ error: "Failed to add token" }, { status: 500 });
  }
}
