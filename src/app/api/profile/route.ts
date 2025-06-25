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

    const profile = {
      username: user.username,
      displayName: user.displayName || user.username,
      gmail: user.gmail,
      avatar: user.avatar,
      walletAddress: wallets[0]?.walletAddress || null,
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
