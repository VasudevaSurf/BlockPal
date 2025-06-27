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
    const type = searchParams.get("type") || "friends"; // friends, requests, suggestions
    const query = searchParams.get("query");

    const { db } = await connectToDatabase();

    if (type === "suggestions" && query) {
      // Search for users by username or display name (excluding friends and pending requests)
      const existingFriends = await db
        .collection("friends")
        .find({
          $or: [
            { requesterUsername: decoded.username },
            { receiverUsername: decoded.username },
          ],
        })
        .toArray();

      const excludeUsernames = [
        decoded.username,
        ...existingFriends.map((f) => f.requesterUsername),
        ...existingFriends.map((f) => f.receiverUsername),
      ];

      const suggestions = await db
        .collection("users")
        .find({
          $and: [
            {
              $or: [
                { username: { $regex: query, $options: "i" } },
                { displayName: { $regex: query, $options: "i" } },
              ],
            },
            { username: { $nin: excludeUsernames } },
          ],
        })
        .limit(10)
        .project({
          username: 1,
          displayName: 1,
          avatar: 1,
          gmail: 1,
        })
        .toArray();

      return NextResponse.json({ suggestions });
    }

    if (type === "friends") {
      // Get accepted friends
      const friendships = await db
        .collection("friends")
        .find({
          $or: [
            { requesterUsername: decoded.username, status: "accepted" },
            { receiverUsername: decoded.username, status: "accepted" },
          ],
        })
        .toArray();

      const friendUsernames = friendships.map((f) =>
        f.requesterUsername === decoded.username
          ? f.receiverUsername
          : f.requesterUsername
      );

      const friends = await db
        .collection("users")
        .find({
          username: { $in: friendUsernames },
        })
        .project({
          username: 1,
          displayName: 1,
          avatar: 1,
          gmail: 1,
        })
        .toArray();

      return NextResponse.json({ friends });
    }

    if (type === "requests") {
      // Get pending friend requests (received)
      const pendingRequests = await db
        .collection("friends")
        .find({
          receiverUsername: decoded.username,
          status: "pending",
        })
        .toArray();

      const requesterUsernames = pendingRequests.map(
        (r) => r.requesterUsername
      );

      const requesters = await db
        .collection("users")
        .find({
          username: { $in: requesterUsernames },
        })
        .project({
          username: 1,
          displayName: 1,
          avatar: 1,
          gmail: 1,
        })
        .toArray();

      const requests = pendingRequests.map((req) => {
        const requester = requesters.find(
          (u) => u.username === req.requesterUsername
        );
        return {
          ...req,
          requesterData: requester,
        };
      });

      return NextResponse.json({ requests });
    }

    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  } catch (error) {
    console.error("Get friends error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get("auth-token")?.value;
    const decoded = verifyToken(token);

    if (!decoded) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { action, targetUsername } = await request.json();

    if (!targetUsername) {
      return NextResponse.json(
        { error: "Target username required" },
        { status: 400 }
      );
    }

    const { db } = await connectToDatabase();

    // Check if target user exists
    const targetUser = await db
      .collection("users")
      .findOne({ username: targetUsername });

    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (action === "send_request") {
      // Check if friendship already exists
      const existingFriendship = await db.collection("friends").findOne({
        $or: [
          {
            requesterUsername: decoded.username,
            receiverUsername: targetUsername,
          },
          {
            requesterUsername: targetUsername,
            receiverUsername: decoded.username,
          },
        ],
      });

      if (existingFriendship) {
        return NextResponse.json(
          { error: "Friendship request already exists" },
          { status: 409 }
        );
      }

      // Create friend request
      const friendRequest = {
        requesterUsername: decoded.username,
        receiverUsername: targetUsername,
        status: "pending",
        requestedAt: new Date(),
      };

      await db.collection("friends").insertOne(friendRequest);

      return NextResponse.json({
        success: true,
        message: "Friend request sent successfully",
      });
    }

    if (action === "accept_request") {
      const result = await db.collection("friends").updateOne(
        {
          requesterUsername: targetUsername,
          receiverUsername: decoded.username,
          status: "pending",
        },
        {
          $set: {
            status: "accepted",
            respondedAt: new Date(),
          },
        }
      );

      if (result.matchedCount === 0) {
        return NextResponse.json(
          { error: "Friend request not found" },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        message: "Friend request accepted",
      });
    }

    if (action === "decline_request") {
      const result = await db.collection("friends").updateOne(
        {
          requesterUsername: targetUsername,
          receiverUsername: decoded.username,
          status: "pending",
        },
        {
          $set: {
            status: "declined",
            respondedAt: new Date(),
          },
        }
      );

      if (result.matchedCount === 0) {
        return NextResponse.json(
          { error: "Friend request not found" },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        message: "Friend request declined",
      });
    }

    if (action === "remove_friend") {
      const result = await db.collection("friends").deleteOne({
        $or: [
          {
            requesterUsername: decoded.username,
            receiverUsername: targetUsername,
            status: "accepted",
          },
          {
            requesterUsername: targetUsername,
            receiverUsername: decoded.username,
            status: "accepted",
          },
        ],
      });

      if (result.deletedCount === 0) {
        return NextResponse.json(
          { error: "Friendship not found" },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        message: "Friend removed successfully",
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Friends action error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
