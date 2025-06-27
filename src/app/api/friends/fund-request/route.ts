// src/app/api/friends/fund-request/route.ts - FIXED VERSION
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

    const {
      friendUsername,
      tokenSymbol,
      amount,
      message,
      requesterWalletAddress,
    } = await request.json();

    if (!friendUsername || !tokenSymbol || !amount) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // FIXED: Validate that requesterWalletAddress is provided (current user's active wallet)
    if (!requesterWalletAddress) {
      return NextResponse.json(
        { error: "Requester wallet address is required" },
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

    // FIXED: Create fund request with the current user's wallet address
    const fundRequest = {
      requestId: `fund_${Date.now()}_${Math.random()
        .toString(36)
        .substr(2, 9)}`,
      requesterUsername: decoded.username, // Current user (who wants the funds)
      requesterWalletAddress: requesterWalletAddress, // Current user's active wallet
      recipientUsername: friendUsername, // Friend (who will send the funds)
      tokenSymbol,
      amount: amount.toString(),
      message: message || "",
      status: "pending",
      requestedAt: new Date(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    };

    console.log("💰 Creating fund request:", {
      requester: decoded.username,
      requesterWallet: requesterWalletAddress,
      recipient: friendUsername,
      amount: amount,
      token: tokenSymbol,
    });

    await db.collection("fund_requests").insertOne(fundRequest);

    // Create notification for the recipient (friend who will send funds)
    const notification = {
      username: friendUsername,
      type: "fund_request",
      title: "Fund Request",
      message: `${decoded.username} requested ${amount} ${tokenSymbol}`,
      isRead: false,
      relatedData: {
        requestId: fundRequest.requestId,
        requesterUsername: decoded.username,
        requesterWalletAddress: requesterWalletAddress,
        amount,
        tokenSymbol,
      },
      createdAt: new Date(),
    };

    await db.collection("notifications").insertOne(notification);

    console.log("✅ Fund request created successfully");

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
      // Fund requests where current user is the recipient (will send funds)
      query = { recipientUsername: decoded.username };
    } else {
      // Fund requests where current user is the requester (will receive funds)
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
