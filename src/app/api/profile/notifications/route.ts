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

    const updateData = await request.json();
    const { db } = await connectToDatabase();

    // Get current user to merge preferences
    const user = await db.collection("users").findOne({
      _id: new ObjectId(decoded.userId),
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Merge with existing preferences
    const currentPreferences = user.preferences || {};
    const updatedPreferences = { ...currentPreferences };

    // Update specific notification settings
    if (updateData.hasOwnProperty("pushNotifications")) {
      updatedPreferences.pushNotifications = updateData.pushNotifications;
    }
    if (updateData.hasOwnProperty("emailNotifications")) {
      updatedPreferences.emailNotifications = updateData.emailNotifications;
    }
    if (updateData.hasOwnProperty("notifications")) {
      updatedPreferences.notifications = updateData.notifications;
    }
    if (updateData.hasOwnProperty("friendRequests")) {
      updatedPreferences.friendRequests = updateData.friendRequests;
    }

    // Update currency if provided
    const updateFields: any = { preferences: updatedPreferences };
    if (updateData.currency) {
      updateFields.currency = updateData.currency;
    }

    // Update user preferences
    const result = await db.collection("users").updateOne(
      { _id: new ObjectId(decoded.userId) },
      {
        $set: {
          ...updateFields,
          preferencesUpdatedAt: new Date(),
        },
      }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      message: "Notification preferences updated successfully",
      preferences: updatedPreferences,
    });
  } catch (error) {
    console.error("Update notifications error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
