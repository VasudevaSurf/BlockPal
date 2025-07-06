// src/app/api/profile/route.ts - Updated with active wallet management
import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get("auth-token")?.value;
    const decoded = verifyToken(token);

    if (!decoded) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { db } = await connectToDatabase();

    // Get user profile data
    const user = await db.collection("users").findOne(
      { _id: new ObjectId(decoded.userId) },
      { projection: { passwordHash: 0 } } // Exclude password hash
    );

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get user statistics
    const [wallets, transactions, schedules, friends] = await Promise.all([
      db.collection("wallets").find({ username: user.username }).toArray(),
      db.collection("transactions").countDocuments({
        $or: [
          { senderUsername: user.username },
          { receiverUsername: user.username },
        ],
      }),
      db.collection("schedules").countDocuments({
        username: user.username,
        status: "active",
      }),
      db.collection("friends").countDocuments({
        $or: [
          { requesterUsername: user.username },
          { receiverUsername: user.username },
        ],
        status: "accepted",
      }),
    ]);

    // Find the active wallet
    const activeWallet =
      wallets.find((w) => w._id.toString() === user.activeWalletId) ||
      wallets[0];

    const profile = {
      username: user.username,
      displayName: user.displayName || user.username,
      gmail: user.gmail,
      avatar: user.avatar,
      walletAddress: activeWallet?.walletAddress || null,
      activeWalletId: user.activeWalletId || null,
      accountCreated: user.createdAt
        ? new Date(user.createdAt).toLocaleDateString()
        : "Unknown",
      totalTransactions: transactions || 0,
      scheduledPayments: schedules || 0,
      friendsCount: friends || 0,
      preferences: {
        notifications: user.preferences?.notifications ?? true,
        pushNotifications: user.preferences?.pushNotifications ?? true,
        emailNotifications: user.preferences?.emailNotifications ?? true,
        friendRequests: user.preferences?.friendRequests || "everyone",
        currency: user.currency || "USD",
      },
      twoFactorEnabled: user.twoFactorEnabled || false,
    };

    return NextResponse.json({ profile });
  } catch (error) {
    console.error("Get profile error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const token = request.cookies.get("auth-token")?.value;
    const decoded = verifyToken(token);

    if (!decoded) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const updateData = await request.json();
    const { db } = await connectToDatabase();

    // Prepare update object
    const updateFields: any = {};

    if (updateData.displayName)
      updateFields.displayName = updateData.displayName;
    if (updateData.currency) updateFields.currency = updateData.currency;
    if (updateData.preferences) {
      updateFields.preferences = updateData.preferences;
    }

    // IMPORTANT: Handle active wallet update
    if (updateData.activeWalletId) {
      // Verify the wallet belongs to this user
      const wallet = await db.collection("wallets").findOne({
        _id: new ObjectId(updateData.activeWalletId),
        username: decoded.username,
      });

      if (!wallet) {
        return NextResponse.json(
          { error: "Wallet not found or access denied" },
          { status: 404 }
        );
      }

      updateFields.activeWalletId = updateData.activeWalletId;
      console.log(
        `✅ Setting active wallet for ${decoded.username}: ${updateData.activeWalletId}`
      );
    }

    // Update user profile
    const result = await db.collection("users").updateOne(
      { _id: new ObjectId(decoded.userId) },
      {
        $set: {
          ...updateFields,
          updatedAt: new Date(),
        },
      }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Return updated profile
    const updatedUser = await db
      .collection("users")
      .findOne(
        { _id: new ObjectId(decoded.userId) },
        { projection: { passwordHash: 0 } }
      );

    return NextResponse.json({
      message: "Profile updated successfully",
      profile: updatedUser,
    });
  } catch (error) {
    console.error("Update profile error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
