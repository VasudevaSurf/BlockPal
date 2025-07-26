// src/app/api/profile/verify-password/route.ts
import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import bcrypt from "bcryptjs";

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get("auth-token")?.value;
    const decoded = verifyToken(token);

    if (!decoded) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { password } = await request.json();

    if (!password) {
      return NextResponse.json(
        { error: "Password is required" },
        { status: 400 }
      );
    }

    console.log("🔐 Verifying password for user:", decoded.username);

    const { db } = await connectToDatabase();

    // Get user with password hash
    const user = await db.collection("users").findOne({
      _id: new ObjectId(decoded.userId),
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check if user has a password (not Google-only account)
    if (!user.passwordHash) {
      return NextResponse.json(
        {
          error:
            "This account uses Google sign-in. Password verification not available.",
        },
        { status: 400 }
      );
    }

    // Verify the password
    const isValidPassword = await bcrypt.compare(password, user.passwordHash);

    if (!isValidPassword) {
      console.log("❌ Invalid password for user:", decoded.username);
      return NextResponse.json(
        { error: "Incorrect password" },
        { status: 401 }
      );
    }

    console.log(
      "✅ Password verified successfully for user:",
      decoded.username
    );

    return NextResponse.json({
      success: true,
      message: "Password verified successfully",
    });
  } catch (error) {
    console.error("❌ Password verification error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
