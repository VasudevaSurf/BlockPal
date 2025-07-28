// src/app/api/wallets/rename/route.ts
import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export async function PUT(request: NextRequest) {
  try {
    const token = request.cookies.get("auth-token")?.value;
    const decoded = verifyToken(token);

    if (!decoded) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { walletId, newName } = await request.json();

    if (!walletId) {
      return NextResponse.json(
        { error: "Wallet ID is required" },
        { status: 400 }
      );
    }

    if (
      !newName ||
      typeof newName !== "string" ||
      newName.trim().length === 0
    ) {
      return NextResponse.json(
        { error: "Valid wallet name is required" },
        { status: 400 }
      );
    }

    if (newName.trim().length > 50) {
      return NextResponse.json(
        { error: "Wallet name must be 50 characters or less" },
        { status: 400 }
      );
    }

    const { db } = await connectToDatabase();

    // Verify the wallet exists and belongs to this user
    const wallet = await db.collection("wallets").findOne({
      _id: new ObjectId(walletId),
      username: decoded.username,
    });

    if (!wallet) {
      return NextResponse.json(
        { error: "Wallet not found or access denied" },
        { status: 404 }
      );
    }

    // Update the wallet name
    const result = await db.collection("wallets").updateOne(
      { _id: new ObjectId(walletId) },
      {
        $set: {
          walletName: newName.trim(),
          updatedAt: new Date(),
        },
      }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "Wallet not found" }, { status: 404 });
    }

    console.log(
      `✅ Wallet renamed: ${wallet.walletName} → ${newName.trim()} for user ${
        decoded.username
      }`
    );

    // Get the updated wallet for verification
    const updatedWallet = await db.collection("wallets").findOne({
      _id: new ObjectId(walletId),
    });

    return NextResponse.json({
      success: true,
      message: "Wallet renamed successfully",
      walletId: walletId,
      oldName: wallet.walletName,
      newName: newName.trim(),
      updatedWallet: {
        id: updatedWallet?._id.toString(),
        name: updatedWallet?.walletName,
        address: updatedWallet?.walletAddress,
      },
    });
  } catch (error) {
    console.error("❌ Rename wallet error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
