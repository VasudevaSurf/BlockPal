// src/app/api/dashboard/remove-token/route.ts - NEW FILE
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

    console.log(`➖ Removing token ${normalizedContract} from dashboard`);

    const { db } = await connectToDatabase();

    // Get current dashboard data
    const dashboardData = await db.collection("dashboard_tokens").findOne({
      username: decoded.username,
      walletAddress: normalizedWallet,
    });

    if (!dashboardData) {
      return NextResponse.json(
        { error: "Dashboard not found" },
        { status: 404 }
      );
    }

    // Remove from service cache
    dashboardServiceV2.removeTokenFromDashboard(contractAddress, walletAddress);

    // Filter out the token
    const updatedMetadata = { ...dashboardData.metadata };
    delete updatedMetadata[normalizedContract];

    const removedToken = dashboardData.tokens?.find(
      (t: any) => t.contractAddress.toLowerCase() === normalizedContract
    );

    const updatedTokens =
      dashboardData.tokens?.filter(
        (t: any) => t.contractAddress.toLowerCase() !== normalizedContract
      ) || [];

    const updatedTotalValue =
      (dashboardData.totalValue || 0) - (removedToken?.value || 0);

    // Update database
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

    console.log(`✅ Token removed successfully`);

    return NextResponse.json({
      success: true,
      message: "Token removed from dashboard",
    });
  } catch (error) {
    console.error("❌ Remove token error:", error);
    return NextResponse.json(
      { error: "Failed to remove token" },
      { status: 500 }
    );
  }
}
