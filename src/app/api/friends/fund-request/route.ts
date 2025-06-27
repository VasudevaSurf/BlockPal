import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get("auth-token")?.value;
    const decoded = verifyToken(token);

    if (!decoded) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { friendUsername, tokenSymbol, amount, message } =
      await request.json();

    if (!friendUsername || !tokenSymbol || !amount) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const { db } = await connectToDatabase();

    // Verify friendship exists
    const friendship = await db.collection("friends").findOne({
      $or: [
        {
          requesterUsername: decoded.username,
          receiverUsername: friendUsername,
          status: "accepted",
        },
        {
          requesterUsername: friendUsername,
          receiverUsername: decoded.username,
          status: "accepted",
        },
      ],
    });

    if (!friendship) {
      return NextResponse.json(
        { error: "You are not friends with this user" },
        { status: 403 }
      );
    }

    // Create fund request
    const fundRequest = {
      requestId: `fund_${Date.now()}_${Math.random()
        .toString(36)
        .substr(2, 9)}`,
      requesterUsername: decoded.username,
      recipientUsername: friendUsername,
      tokenSymbol,
      amount: amount.toString(),
      message: message || "",
      status: "pending",
      requestedAt: new Date(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    };

    await db.collection("fund_requests").insertOne(fundRequest);

    // Create notification for the recipient
    const notification = {
      username: friendUsername,
      type: "fund_request",
      title: "Fund Request",
      message: `${decoded.username} requested ${amount} ${tokenSymbol}`,
      isRead: false,
      relatedData: {
        requestId: fundRequest.requestId,
        requesterUsername: decoded.username,
        amount,
        tokenSymbol,
      },
      createdAt: new Date(),
    };

    await db.collection("notifications").insertOne(notification);

    return NextResponse.json({
      success: true,
      message: "Fund request sent successfully",
      requestId: fundRequest.requestId,
    });
  } catch (error) {
    console.error("Fund request error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get("auth-token")?.value;
    const decoded = verifyToken(token);

    if (!decoded) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "received"; // received, sent

    const { db } = await connectToDatabase();

    let query;
    if (type === "received") {
      query = { recipientUsername: decoded.username };
    } else {
      query = { requesterUsername: decoded.username };
    }

    const fundRequests = await db
      .collection("fund_requests")
      .find(query)
      .sort({ requestedAt: -1 })
      .limit(50)
      .toArray();

    return NextResponse.json({ fundRequests });
  } catch (error) {
    console.error("Get fund requests error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
