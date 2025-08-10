// src/app/api/dashboard/add-token/route.ts - FIXED VERSION
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

    const normalizedContract = contractAddress.toLowerCase();
    const normalizedWallet = walletAddress.toLowerCase();

    console.log(`➕ Adding token ${normalizedContract} to dashboard`);

    const { db } = await connectToDatabase();

    // Get existing dashboard data
    const dashboardData = await db.collection("dashboard_tokens").findOne({
      username: decoded.username,
      walletAddress: normalizedWallet,
    });

    // Check if token already exists
    if (dashboardData?.metadata && dashboardData.metadata[normalizedContract]) {
      return NextResponse.json(
        { error: "Token already in dashboard" },
        { status: 400 }
      );
    }

    // Add token using service
    const { token: newToken, metadata } =
      await dashboardServiceV2.addTokenToDashboard(
        contractAddress,
        walletAddress
      );

    // Update database
    const updatedMetadata = {
      ...(dashboardData?.metadata || {}),
      [normalizedContract]: metadata,
    };

    const updatedTokens = [...(dashboardData?.tokens || []), newToken];
    const updatedTotalValue = (dashboardData?.totalValue || 0) + newToken.value;

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
        $setOnInsert: {
          username: decoded.username,
          walletAddress: normalizedWallet,
          createdAt: new Date(),
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
  } catch (error: any) {
    console.error("❌ Add token error:", error);
    return NextResponse.json(
      {
        error: error.message || "Failed to add token",
        details: error.toString(),
      },
      { status: 500 }
    );
  }
}
