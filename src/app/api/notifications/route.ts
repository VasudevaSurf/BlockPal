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

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "20");
    const offset = parseInt(searchParams.get("offset") || "0");
    const unreadOnly = searchParams.get("unreadOnly") === "true";

    const { db } = await connectToDatabase();

    // Build query
    const query: any = { username: decoded.username };
    if (unreadOnly) {
      query.isRead = false;
    }

    // Get notifications
    const notifications = await db
      .collection("notifications")
      .find(query)
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(limit)
      .toArray();

    // Get total count
    const totalCount = await db
      .collection("notifications")
      .countDocuments(query);
    const unreadCount = await db
      .collection("notifications")
      .countDocuments({ username: decoded.username, isRead: false });

    return NextResponse.json({
      notifications,
      totalCount,
      unreadCount,
      hasMore: offset + notifications.length < totalCount,
    });
  } catch (error) {
    console.error("Get notifications error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const token = request.cookies.get("auth-token")?.value;
    const decoded = verifyToken(token);

    if (!decoded) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { notificationId, action } = await request.json();
    const { db } = await connectToDatabase();

    if (action === "mark_read") {
      if (notificationId) {
        // Mark specific notification as read
        const result = await db.collection("notifications").updateOne(
          {
            _id: new ObjectId(notificationId),
            username: decoded.username,
          },
          {
            $set: {
              isRead: true,
              readAt: new Date(),
            },
          }
        );

        if (result.matchedCount === 0) {
          return NextResponse.json(
            { error: "Notification not found" },
            { status: 404 }
          );
        }
      } else {
        // Mark all notifications as read
        await db.collection("notifications").updateMany(
          {
            username: decoded.username,
            isRead: false,
          },
          {
            $set: {
              isRead: true,
              readAt: new Date(),
            },
          }
        );
      }

      return NextResponse.json({
        success: true,
        message: "Notification(s) marked as read",
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Update notification error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
