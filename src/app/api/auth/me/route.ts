// src/app/api/auth/me/route.ts - UPDATED with database verification
import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { verifyToken } from "@/lib/auth";
import { ObjectId } from "mongodb";

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get("auth-token")?.value;
    const decoded = verifyToken(token);

    if (!decoded) {
      console.log("❌ /api/auth/me: Invalid token");

      // ✅ UPDATED: Clear cookie and return 401
      const response = NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
      response.cookies.delete("auth-token");

      return response;
    }

    const { db } = await connectToDatabase();

    // ✅ CRITICAL: Verify user still exists in database
    const user = await db
      .collection("users")
      .findOne(
        { _id: new ObjectId(decoded.userId) },
        { projection: { passwordHash: 0 } }
      );

    if (!user) {
      console.log(
        "❌ /api/auth/me: User not found in database (likely deleted)"
      );

      // ✅ UPDATED: User was deleted from database, clear cookie
      const response = NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
      response.cookies.delete("auth-token");

      return response;
    }

    console.log("✅ /api/auth/me: User verified:", user.username);

    const userData = {
      id: user._id,
      username: user.username,
      displayName: user.displayName,
      email: user.gmail,
      avatar: user.avatar,
      currency: user.currency,
    };

    return NextResponse.json({ user: userData });
  } catch (error) {
    console.error("❌ Auth check error:", error);

    // ✅ UPDATED: Clear cookie on error
    const response = NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
    response.cookies.delete("auth-token");

    return response;
  }
}
