// src/app/api/profile/route.ts - FIXED with auth provider info
import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get("auth-token")?.value;
    const decoded = verifyToken(token);

    if (!decoded) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { db } = await connectToDatabase();

    console.log("🔍 Fetching profile for user:", decoded.username);

    // Get user profile with auth provider info
    const user = await db
      .collection("users")
      .findOne(
        { username: decoded.username },
        { projection: { passwordHash: 0 } }
      );

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get actual transaction count
    const totalTransactions = await db
      .collection("executed_transactions")
      .countDocuments({
        username: decoded.username,
      });

    // Get completed scheduled payments count only
    const scheduledPayments = await db.collection("schedules").countDocuments({
      username: decoded.username,
      status: "completed",
    });

    // Get friends count
    const friendsCount = await db.collection("friends").countDocuments({
      $and: [
        {
          $or: [
            { requesterUsername: decoded.username },
            { receiverUsername: decoded.username },
          ],
        },
        { status: "accepted" },
      ],
    });

    console.log("📊 Profile stats:", {
      username: decoded.username,
      totalTransactions,
      completedScheduledPayments: scheduledPayments,
      friendsCount,
    });

    const profile = {
      username: user.username,
      displayName: user.displayName || user.username,
      gmail: user.gmail || user.email,
      avatar: user.avatar || null,
      accountCreated: user.createdAt
        ? new Date(user.createdAt).toLocaleDateString()
        : new Date().toLocaleDateString(),
      // Use actual counts from database
      totalTransactions,
      scheduledPayments,
      friendsCount,
      preferences: {
        notifications: user.preferences?.notifications !== false,
        pushNotifications: user.preferences?.pushNotifications !== false,
        emailNotifications: user.preferences?.emailNotifications !== false,
        friendRequests: user.preferences?.friendRequests || "everyone",
        currency: user.preferences?.currency || "USD",
      },
      // Get actual 2FA status
      twoFactorEnabled: user.twoFactorEnabled || false,
      // NEW: Add authentication provider information
      authProvider: user.authProvider || (user.googleId ? "google" : "email"),
      hasPassword: !!user.passwordHash,
      hasGoogleAuth: !!user.googleId,
    };

    console.log("✅ Profile data prepared:", {
      username: profile.username,
      totalTransactions: profile.totalTransactions,
      completedScheduledPayments: profile.scheduledPayments,
      friendsCount: profile.friendsCount,
      twoFactorEnabled: profile.twoFactorEnabled,
      authProvider: profile.authProvider,
      hasPassword: profile.hasPassword,
      hasGoogleAuth: profile.hasGoogleAuth,
    });

    return NextResponse.json({
      success: true,
      profile,
    });
  } catch (error) {
    console.error("💥 Error fetching profile:", error);
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

    const body = await request.json();
    const { displayName } = body;

    const { db } = await connectToDatabase();

    console.log("🔄 Updating profile for user:", decoded.username, {
      displayName,
    });

    const updateData: any = {};
    if (displayName !== undefined) {
      updateData.displayName = displayName;
    }

    updateData.updatedAt = new Date();

    const result = await db
      .collection("users")
      .updateOne({ username: decoded.username }, { $set: updateData });

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Return updated profile
    const updatedUser = await db
      .collection("users")
      .findOne(
        { username: decoded.username },
        { projection: { passwordHash: 0 } }
      );

    // Get updated stats
    const totalTransactions = await db
      .collection("executed_transactions")
      .countDocuments({
        username: decoded.username,
      });

    const scheduledPayments = await db.collection("schedules").countDocuments({
      username: decoded.username,
      status: "completed",
    });

    const friendsCount = await db.collection("friends").countDocuments({
      $and: [
        {
          $or: [
            { requesterUsername: decoded.username },
            { receiverUsername: decoded.username },
          ],
        },
        { status: "accepted" },
      ],
    });

    const profile = {
      username: updatedUser.username,
      displayName: updatedUser.displayName || updatedUser.username,
      gmail: updatedUser.gmail || updatedUser.email,
      avatar: updatedUser.avatar || null,
      accountCreated: updatedUser.createdAt
        ? new Date(updatedUser.createdAt).toLocaleDateString()
        : new Date().toLocaleDateString(),
      totalTransactions,
      scheduledPayments,
      friendsCount,
      preferences: {
        notifications: updatedUser.preferences?.notifications !== false,
        pushNotifications: updatedUser.preferences?.pushNotifications !== false,
        emailNotifications:
          updatedUser.preferences?.emailNotifications !== false,
        friendRequests: updatedUser.preferences?.friendRequests || "everyone",
        currency: updatedUser.preferences?.currency || "USD",
      },
      twoFactorEnabled: updatedUser.twoFactorEnabled || false,
      // NEW: Add authentication provider information
      authProvider:
        updatedUser.authProvider || (updatedUser.googleId ? "google" : "email"),
      hasPassword: !!updatedUser.passwordHash,
      hasGoogleAuth: !!updatedUser.googleId,
    };

    console.log("✅ Profile updated successfully");

    return NextResponse.json({
      success: true,
      profile,
    });
  } catch (error) {
    console.error("💥 Error updating profile:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
