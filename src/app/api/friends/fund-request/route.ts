// src/app/api/friends/fund-request/route.ts - FIXED VERSION (Enhanced Token Handling)
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
      tokenName,
      contractAddress,
      decimals,
      amount,
      message,
      requesterWalletAddress,
    } = await request.json();

    console.log("💰 Fund request data received:", {
      friendUsername,
      tokenSymbol,
      tokenName,
      contractAddress,
      decimals,
      amount,
      requesterWalletAddress,
    });

    // FIXED: Enhanced validation
    if (!friendUsername || !tokenSymbol || !amount) {
      return NextResponse.json(
        {
          error: "Missing required fields: friendUsername, tokenSymbol, amount",
        },
        { status: 400 }
      );
    }

    // FIXED: Validate that requesterWalletAddress is provided
    if (!requesterWalletAddress) {
      return NextResponse.json(
        { error: "Requester wallet address is required" },
        { status: 400 }
      );
    }

    // FIXED: Validate amount
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return NextResponse.json(
        { error: "Invalid amount: must be a positive number" },
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

    // FIXED: Create enhanced fund request with complete token information
    const fundRequest = {
      requestId: `fund_${Date.now()}_${Math.random()
        .toString(36)
        .substr(2, 9)}`,
      requesterUsername: decoded.username, // Current user (who wants the funds)
      requesterWalletAddress: requesterWalletAddress, // Current user's active wallet
      recipientUsername: friendUsername, // Friend (who will send the funds)

      // FIXED: Enhanced token information storage
      tokenSymbol: tokenSymbol.toString().trim(),
      tokenName: tokenName
        ? tokenName.toString().trim()
        : tokenSymbol.toString().trim(),
      contractAddress: contractAddress
        ? contractAddress.toString().trim()
        : "native",
      decimals: decimals ? parseInt(decimals.toString()) : 18,

      amount: parsedAmount.toString(),
      message: message ? message.toString().trim() : "",
      status: "pending",
      requestedAt: new Date(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days

      // Additional metadata for tracking
      createdBy: decoded.username,
      lastUpdated: new Date(),
    };

    console.log("💰 Creating enhanced fund request:", {
      requester: decoded.username,
      requesterWallet: requesterWalletAddress,
      recipient: friendUsername,
      amount: fundRequest.amount,
      token: `${fundRequest.tokenSymbol} (${fundRequest.tokenName})`,
      contractAddress: fundRequest.contractAddress,
      decimals: fundRequest.decimals,
    });

    // FIXED: Check for duplicate recent requests (within last hour)
    const recentRequest = await db.collection("fund_requests").findOne({
      requesterUsername: decoded.username,
      recipientUsername: friendUsername,
      tokenSymbol: fundRequest.tokenSymbol,
      contractAddress: fundRequest.contractAddress,
      amount: fundRequest.amount,
      status: "pending",
      requestedAt: {
        $gte: new Date(Date.now() - 60 * 60 * 1000), // Last hour
      },
    });

    if (recentRequest) {
      return NextResponse.json(
        {
          error:
            "A similar fund request was already sent recently. Please wait before sending another.",
        },
        { status: 409 }
      );
    }

    // Insert the fund request
    const insertResult = await db
      .collection("fund_requests")
      .insertOne(fundRequest);

    if (!insertResult.insertedId) {
      throw new Error("Failed to create fund request in database");
    }

    // FIXED: Create enhanced notification for the recipient (friend who will send funds)
    const notification = {
      username: friendUsername,
      type: "fund_request",
      title: "New Fund Request",
      message: `${decoded.username} requested ${fundRequest.amount} ${fundRequest.tokenSymbol}`,
      isRead: false,
      relatedData: {
        requestId: fundRequest.requestId,
        requesterUsername: decoded.username,
        requesterWalletAddress: requesterWalletAddress,
        amount: fundRequest.amount,
        tokenSymbol: fundRequest.tokenSymbol,
        tokenName: fundRequest.tokenName,
        contractAddress: fundRequest.contractAddress,
        decimals: fundRequest.decimals,
        message: fundRequest.message,
      },
      createdAt: new Date(),
      expiresAt: fundRequest.expiresAt,
    };

    const notificationResult = await db
      .collection("notifications")
      .insertOne(notification);

    if (!notificationResult.insertedId) {
      console.warn(
        "⚠️ Failed to create notification, but fund request was created"
      );
    }

    console.log("✅ Enhanced fund request created successfully");

    return NextResponse.json({
      success: true,
      message: "Fund request sent successfully",
      requestId: fundRequest.requestId,
      data: {
        amount: fundRequest.amount,
        token: {
          symbol: fundRequest.tokenSymbol,
          name: fundRequest.tokenName,
          contractAddress: fundRequest.contractAddress,
          decimals: fundRequest.decimals,
        },
        recipient: friendUsername,
        expiresAt: fundRequest.expiresAt,
      },
    });
  } catch (error) {
    console.error("💥 Fund request error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
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
    const status = searchParams.get("status"); // pending, fulfilled, declined, expired
    const limit = parseInt(searchParams.get("limit") || "50");

    const { db } = await connectToDatabase();

    let query: any;
    if (type === "received") {
      // Fund requests where current user is the recipient (will send funds)
      query = { recipientUsername: decoded.username };
    } else {
      // Fund requests where current user is the requester (will receive funds)
      query = { requesterUsername: decoded.username };
    }

    // FIXED: Add status filter if provided
    if (
      status &&
      ["pending", "fulfilled", "declined", "expired"].includes(status)
    ) {
      query.status = status;
    }

    // FIXED: Enhanced query with better sorting and limit
    const fundRequests = await db
      .collection("fund_requests")
      .find(query)
      .sort({
        requestedAt: -1, // Most recent first
        status: 1, // Pending first within same date
      })
      .limit(Math.min(limit, 100)) // Cap at 100
      .toArray();

    // FIXED: Process fund requests to check for expired ones
    const processedRequests = fundRequests.map((request) => {
      const now = new Date();
      const expiresAt = new Date(request.expiresAt);

      // Auto-expire requests that are past their expiration date
      if (request.status === "pending" && now > expiresAt) {
        // Update status to expired (fire and forget)
        db.collection("fund_requests")
          .updateOne(
            { _id: request._id },
            {
              $set: {
                status: "expired",
                lastUpdated: now,
              },
            }
          )
          .catch(console.error);

        request.status = "expired";
      }

      return request;
    });

    console.log(
      `✅ Fund requests loaded: ${processedRequests.length} requests for ${decoded.username} (type: ${type})`
    );

    return NextResponse.json({
      fundRequests: processedRequests,
      meta: {
        total: processedRequests.length,
        type,
        status: status || "all",
        user: decoded.username,
      },
    });
  } catch (error) {
    console.error("💥 Get fund requests error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
