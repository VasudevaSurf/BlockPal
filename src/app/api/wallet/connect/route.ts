// src/app/api/wallet/connect/route.ts - Store wallet connection in database
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
      return NextResponse.json(
        { error: "Unauthorized - Please log in" },
        { status: 401 }
      );
    }

    const { walletAddress, chainId, walletType } = await request.json();

    // Validation
    if (!walletAddress || !walletAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
      return NextResponse.json(
        { error: "Invalid wallet address format" },
        { status: 400 }
      );
    }

    if (!chainId || isNaN(parseInt(chainId))) {
      return NextResponse.json({ error: "Invalid chain ID" }, { status: 400 });
    }

    console.log(
      `🔗 Connecting wallet for user ${decoded.username}: ${walletAddress} on chain ${chainId}`
    );

    const { db } = await connectToDatabase();

    // Check if wallet already exists for this user
    const existingWallet = await db.collection("user_wallets").findOne({
      userId: new ObjectId(decoded.userId),
      walletAddress: walletAddress.toLowerCase(),
    });

    if (existingWallet) {
      // Update existing wallet connection
      await db.collection("user_wallets").updateOne(
        { _id: existingWallet._id },
        {
          $set: {
            chainId: parseInt(chainId),
            walletType: walletType || "external",
            lastConnected: new Date(),
            isActive: true,
          },
        }
      );

      console.log(`✅ Updated existing wallet connection: ${walletAddress}`);
    } else {
      // Create new wallet connection
      await db.collection("user_wallets").insertOne({
        userId: new ObjectId(decoded.userId),
        username: decoded.username,
        walletAddress: walletAddress.toLowerCase(),
        chainId: parseInt(chainId),
        walletType: walletType || "external",
        connectedAt: new Date(),
        lastConnected: new Date(),
        isActive: true,
      });

      console.log(`🆕 Created new wallet connection: ${walletAddress}`);
    }

    // Set this as the active wallet for the user (deactivate others)
    await db.collection("user_wallets").updateMany(
      {
        userId: new ObjectId(decoded.userId),
        walletAddress: { $ne: walletAddress.toLowerCase() },
      },
      { $set: { isActive: false } }
    );

    // Update user's active wallet ID in users collection
    await db.collection("users").updateOne(
      { _id: new ObjectId(decoded.userId) },
      {
        $set: {
          activeWalletAddress: walletAddress.toLowerCase(),
          activeWalletChainId: parseInt(chainId),
          walletLastConnected: new Date(),
        },
      }
    );

    return NextResponse.json({
      success: true,
      message: "Wallet connected successfully",
      data: {
        walletAddress: walletAddress.toLowerCase(),
        chainId: parseInt(chainId),
        walletType: walletType || "external",
        isActive: true,
      },
    });
  } catch (error) {
    console.error("❌ Error connecting wallet:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Get user's connected wallets
    const token = request.cookies.get("auth-token")?.value;
    const decoded = verifyToken(token);

    if (!decoded) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { db } = await connectToDatabase();

    // Get all wallets for this user
    const userWallets = await db
      .collection("user_wallets")
      .find({
        userId: new ObjectId(decoded.userId),
      })
      .sort({ lastConnected: -1 })
      .toArray();

    // Get active wallet
    const activeWallet = userWallets.find((wallet) => wallet.isActive);

    return NextResponse.json({
      success: true,
      data: {
        wallets: userWallets.map((wallet) => ({
          id: wallet._id.toString(),
          walletAddress: wallet.walletAddress,
          chainId: wallet.chainId,
          walletType: wallet.walletType,
          isActive: wallet.isActive,
          connectedAt: wallet.connectedAt,
          lastConnected: wallet.lastConnected,
        })),
        activeWallet: activeWallet
          ? {
              id: activeWallet._id.toString(),
              walletAddress: activeWallet.walletAddress,
              chainId: activeWallet.chainId,
              walletType: activeWallet.walletType,
              isActive: activeWallet.isActive,
            }
          : null,
      },
    });
  } catch (error) {
    console.error("❌ Error fetching wallets:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
