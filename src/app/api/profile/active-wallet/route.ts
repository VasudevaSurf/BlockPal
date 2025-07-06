// src/app/api/profile/active-wallet/route.ts - New API for managing active wallet
import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

// GET - Get current active wallet
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get("auth-token")?.value;
    const decoded = verifyToken(token);

    if (!decoded) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { db } = await connectToDatabase();

    // Get user's active wallet ID
    const user = await db
      .collection("users")
      .findOne(
        { _id: new ObjectId(decoded.userId) },
        { projection: { activeWalletId: 1, username: 1 } }
      );

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get all user's wallets
    const wallets = await db
      .collection("wallets")
      .find({
        username: user.username,
      })
      .toArray();

    // Find active wallet or default to first wallet
    let activeWallet = null;
    if (user.activeWalletId) {
      activeWallet = wallets.find(
        (w) => w._id.toString() === user.activeWalletId
      );
    }

    if (!activeWallet && wallets.length > 0) {
      activeWallet = wallets[0];
      // Set the first wallet as active if none is set
      await db.collection("users").updateOne(
        { _id: new ObjectId(decoded.userId) },
        {
          $set: {
            activeWalletId: activeWallet._id.toString(),
            activeWalletUpdatedAt: new Date(),
          },
        }
      );
    }

    return NextResponse.json({
      activeWalletId: activeWallet?._id.toString() || null,
      activeWallet: activeWallet
        ? {
            id: activeWallet._id.toString(),
            name: activeWallet.walletName,
            address: activeWallet.walletAddress,
            isDefault: activeWallet.isDefault || false,
          }
        : null,
      totalWallets: wallets.length,
    });
  } catch (error) {
    console.error("Get active wallet error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT - Set active wallet
export async function PUT(request: NextRequest) {
  try {
    const token = request.cookies.get("auth-token")?.value;
    const decoded = verifyToken(token);

    if (!decoded) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { walletId } = await request.json();

    if (!walletId) {
      return NextResponse.json(
        { error: "Wallet ID is required" },
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

    // Update user's active wallet
    const result = await db.collection("users").updateOne(
      { _id: new ObjectId(decoded.userId) },
      {
        $set: {
          activeWalletId: walletId,
          activeWalletUpdatedAt: new Date(),
        },
      }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    console.log(
      `✅ Active wallet updated for user ${decoded.username}: ${walletId} (${wallet.walletName})`
    );

    return NextResponse.json({
      message: "Active wallet updated successfully",
      activeWalletId: walletId,
      activeWallet: {
        id: wallet._id.toString(),
        name: wallet.walletName,
        address: wallet.walletAddress,
        isDefault: wallet.isDefault || false,
      },
    });
  } catch (error) {
    console.error("Set active wallet error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
