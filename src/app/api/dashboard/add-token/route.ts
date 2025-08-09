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
    const existingToken = dashboardData.metadata?.find(
      (m: any) => m.contractAddress.toLowerCase() === normalizedContract
    );

    if (existingToken) {
      return NextResponse.json(
        { error: "Token already in dashboard" },
        { status: 400 }
      );
    }

    // Add new token using fallback chain
    const { token: newToken, metadata } =
      await dashboardService.addTokenToDashboard(
        contractAddress,
        walletAddress
      );

    // Update metadata in database
    const updatedMetadata = [...(dashboardData.metadata || []), metadata];
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

    // Store in global metadata if it has useful info
    if (metadata.symbol !== "UNKNOWN" || metadata.imageUrl) {
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
    }

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
