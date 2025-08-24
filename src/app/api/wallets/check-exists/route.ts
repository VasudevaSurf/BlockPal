// src/app/api/wallets/check-exists/route.ts
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

    console.log("🔍 Checking if wallet exists:", walletAddress);

    const { db } = await connectToDatabase();

    // Check if wallet exists in database
    const wallet = await db.collection("wallets").findOne({
      walletAddress: walletAddress.toLowerCase(),
    });

    if (!wallet) {
      console.log("❌ Wallet not found in database");
      return NextResponse.json({
        exists: false,
        walletAddress,
      });
    }

    // Get user information
    const user = await db.collection("users").findOne({
      username: wallet.username,
    });

    if (!user) {
      console.log("❌ User not found for wallet");
      return NextResponse.json({
        exists: false,
        walletAddress,
      });
    }

    console.log("✅ Wallet exists, belongs to user:", wallet.username);

    return NextResponse.json({
      exists: true,
      walletAddress,
      username: wallet.username,
      walletName: wallet.walletName,
      userDisplayName: user.displayName || user.username,
    });
  } catch (error) {
    console.error("❌ Error checking wallet exists:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
