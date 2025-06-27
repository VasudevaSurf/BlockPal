import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ requestId: string }> }
) {
  try {
    const token = request.cookies.get("auth-token")?.value;
    const decoded = verifyToken(token);

    if (!decoded) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const resolvedParams = await params;
    const { requestId } = resolvedParams;
    const { action, transactionHash } = await request.json();

    if (!action || !["fulfill", "decline"].includes(action)) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    const { db } = await connectToDatabase();

    // Get the fund request
    const fundRequest = await db.collection("fund_requests").findOne({
      requestId,
      recipientUsername: decoded.username,
      status: "pending",
    });

    if (!fundRequest) {
      return NextResponse.json(
        { error: "Fund request not found or already processed" },
        { status: 404 }
      );
    }

    // Check if request is expired
    if (new Date() > new Date(fundRequest.expiresAt)) {
      await db.collection("fund_requests").updateOne(
        { requestId },
        {
          $set: {
            status: "expired",
            respondedAt: new Date(),
          },
        }
      );

      return NextResponse.json(
        { error: "Fund request has expired" },
        { status: 400 }
      );
    }

    let updateData: any = {
      status: action === "fulfill" ? "fulfilled" : "declined",
      respondedAt: new Date(),
    };

    if (action === "fulfill" && transactionHash) {
      updateData.transactionHash = transactionHash;
    }

    // Update fund request
    await db
      .collection("fund_requests")
      .updateOne({ requestId }, { $set: updateData });

    // Create notification for requester
    const notification = {
      username: fundRequest.requesterUsername,
      type: "fund_request_response",
      title: `Fund Request ${action === "fulfill" ? "Fulfilled" : "Declined"}`,
      message: `${decoded.username} ${
        action === "fulfill" ? "sent" : "declined"
      } your request for ${fundRequest.amount} ${fundRequest.tokenSymbol}`,
      isRead: false,
      relatedData: {
        requestId,
        recipientUsername: decoded.username,
        amount: fundRequest.amount,
        tokenSymbol: fundRequest.tokenSymbol,
        transactionHash: transactionHash || null,
      },
      createdAt: new Date(),
    };

    await db.collection("notifications").insertOne(notification);

    return NextResponse.json({
      success: true,
      message: `Fund request ${
        action === "fulfill" ? "fulfilled" : "declined"
      } successfully`,
    });
  } catch (error) {
    console.error("Update fund request error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ requestId: string }> }
) {
  try {
    const token = request.cookies.get("auth-token")?.value;
    const decoded = verifyToken(token);

    if (!decoded) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const resolvedParams = await params;
    const { requestId } = resolvedParams;
    const { db } = await connectToDatabase();

    const fundRequest = await db.collection("fund_requests").findOne({
      requestId,
      $or: [
        { requesterUsername: decoded.username },
        { recipientUsername: decoded.username },
      ],
    });

    if (!fundRequest) {
      return NextResponse.json(
        { error: "Fund request not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ fundRequest });
  } catch (error) {
    console.error("Get fund request error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
