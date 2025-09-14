// src/app/api/wallet/disconnect/route.ts - Disconnect wallet from database
import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { verifyToken } from "@/lib/auth";
import { ObjectId } from "mongodb";

export async function POST(request: NextRequest) {
  try {
    // Verify user authentication
    const token = request.cookies.get("auth-token")?.value;
    const decoded = verifyToken(token);

    if (!decoded) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { walletAddress } = await request.json();

    console.log(
      `🔌 Disconnecting wallet for user ${decoded.username}: ${walletAddress}`
    );

    const { db } = await connectToDatabase();

    if (walletAddress) {
      // Disconnect specific wallet
      await db.collection("user_wallets").updateOne(
        {
          userId: new ObjectId(decoded.userId),
          walletAddress: walletAddress.toLowerCase(),
        },
        {
          $set: {
            isActive: false,
            lastDisconnected: new Date(),
          },
        }
      );

      console.log(`✅ Disconnected wallet: ${walletAddress}`);
    } else {
      // Disconnect all wallets for user
      await db.collection("user_wallets").updateMany(
        { userId: new ObjectId(decoded.userId) },
        {
          $set: {
            isActive: false,
            lastDisconnected: new Date(),
          },
        }
      );

      console.log(`✅ Disconnected all wallets for user: ${decoded.username}`);
    }

    // Update user's active wallet info
    await db.collection("users").updateOne(
      { _id: new ObjectId(decoded.userId) },
      {
        $unset: {
          activeWalletAddress: "",
          activeWalletChainId: "",
        },
        $set: {
          walletLastDisconnected: new Date(),
        },
      }
    );

    return NextResponse.json({
      success: true,
      message: walletAddress
        ? "Wallet disconnected successfully"
        : "All wallets disconnected successfully",
    });
  } catch (error) {
    console.error("❌ Error disconnecting wallet:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// GET route to check connection status
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get("auth-token")?.value;
    const decoded = verifyToken(token);

    if (!decoded) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { db } = await connectToDatabase();

    // Get active wallet connection
    const activeWallet = await db.collection("user_wallets").findOne({
      userId: new ObjectId(decoded.userId),
      isActive: true,
    });

    return NextResponse.json({
      success: true,
      data: {
        isConnected: !!activeWallet,
        activeWallet: activeWallet
          ? {
              id: activeWallet._id.toString(),
              walletAddress: activeWallet.walletAddress,
              chainId: activeWallet.chainId,
              walletType: activeWallet.walletType,
              connectedAt: activeWallet.connectedAt,
              lastConnected: activeWallet.lastConnected,
            }
          : null,
      },
    });
  } catch (error) {
    console.error("❌ Error checking wallet status:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
