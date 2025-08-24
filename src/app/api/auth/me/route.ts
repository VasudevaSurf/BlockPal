import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { verifyToken } from "@/lib/auth";
import { ObjectId } from "mongodb";

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get("auth-token")?.value;
    const decoded = verifyToken(token);

    if (!decoded) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { db } = await connectToDatabase();

    // Get user data
    const user = await db.collection("users").findOne(
      { _id: new ObjectId(decoded.userId) },
      {
        projection: {
          // EXCLUDE password-related fields
          passwordSalt: 0,
          encryptedVerificationToken: 0,
          verificationTokenIV: 0,
        },
      }
    );

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const userData = {
      id: user._id,
      username: user.username,
      displayName: user.displayName,
      name: user.displayName, // Add name field for compatibility
      primaryWalletAddress: user.primaryWalletAddress,
      avatar: user.avatar,
      currency: user.currency,
    };

    return NextResponse.json({ user: userData });
  } catch (error) {
    console.error("Auth check error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
