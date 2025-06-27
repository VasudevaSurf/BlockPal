// src/app/api/users/by-username/[username]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
    const token = request.cookies.get("auth-token")?.value;
    const decoded = verifyToken(token);

    if (!decoded) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const resolvedParams = await params;
    const { username } = resolvedParams;

    if (!username) {
      return NextResponse.json({ error: "Username required" }, { status: 400 });
    }

    const { db } = await connectToDatabase();

    // Get user by username
    const user = await db.collection("users").findOne(
      { username },
      { projection: { passwordHash: 0 } } // Exclude password hash
    );

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get user's primary wallet address
    const wallet = await db
      .collection("wallets")
      .findOne(
        { username, isDefault: true },
        { projection: { walletAddress: 1 } }
      );

    const userData = {
      username: user.username,
      displayName: user.displayName,
      avatar: user.avatar,
      walletAddress: wallet?.walletAddress || null,
    };

    return NextResponse.json(userData);
  } catch (error) {
    console.error("Get user by username error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
