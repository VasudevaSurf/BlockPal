// src/app/api/auth/check-primary-wallet/route.ts
import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";

export async function POST(request: NextRequest) {
  try {
    const { walletAddress } = await request.json();

    if (!walletAddress) {
      return NextResponse.json(
        { error: "Wallet address is required" },
        { status: 400 }
      );
    }

    console.log("🔍 Checking primary wallet:", walletAddress);

    const { db } = await connectToDatabase();

    // Check if wallet exists as primary wallet
    const user = await db.collection("users").findOne({
      primaryWalletAddress: walletAddress.toLowerCase(),
    });

    if (!user) {
      console.log("❌ Primary wallet not found in database");
      return NextResponse.json({
        exists: false,
        walletAddress,
      });
    }

    console.log("✅ Primary wallet exists, belongs to user:", user.username);

    return NextResponse.json({
      exists: true,
      walletAddress,
      username: user.username,
      userDisplayName: user.displayName || user.username,
    });
  } catch (error) {
    console.error("❌ Error checking primary wallet:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
