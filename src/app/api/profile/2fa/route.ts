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

    const { enabled } = await request.json();

    if (typeof enabled !== "boolean") {
      return NextResponse.json(
        {
          error: "Invalid enabled value",
        },
        { status: 400 }
      );
    }

    const { db } = await connectToDatabase();

    // Update 2FA status
    const result = await db.collection("users").updateOne(
      { _id: new ObjectId(decoded.userId) },
      {
        $set: {
          twoFactorEnabled: enabled,
          twoFactorUpdatedAt: new Date(),
        },
      }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // In a real implementation, you would:
    // 1. Generate and store a 2FA secret if enabling
    // 2. Remove the 2FA secret if disabling
    // 3. Send setup instructions to user's email
    // 4. Require 2FA verification for sensitive operations

    return NextResponse.json({
      message: enabled
        ? "2FA enabled successfully"
        : "2FA disabled successfully",
      enabled,
    });
  } catch (error) {
    console.error("Update 2FA error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
