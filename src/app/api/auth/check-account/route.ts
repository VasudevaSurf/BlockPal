// src/app/api/auth/check-account/route.ts
import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    console.log("🔍 Checking account status for:", email);

    const { db } = await connectToDatabase();

    // Check if user exists
    const user = await db.collection("users").findOne({ gmail: email });

    if (!user) {
      return NextResponse.json({
        exists: false,
        authProvider: null,
        hasPassword: false,
        hasGoogleAuth: false,
        message: "No account found with this email",
      });
    }

    console.log("✅ User found:", {
      email,
      hasPassword: !!user.passwordHash,
      hasGoogleAuth: !!user.googleId,
      authProvider: user.authProvider,
    });

    return NextResponse.json({
      exists: true,
      authProvider: user.authProvider || "email",
      hasPassword: !!user.passwordHash,
      hasGoogleAuth: !!user.googleId,
      username: user.username,
      displayName: user.displayName,
      message:
        user.passwordHash && user.googleId
          ? "Account supports both email/password and Google sign-in"
          : user.googleId
          ? "Account uses Google sign-in"
          : "Account uses email/password sign-in",
    });
  } catch (error) {
    console.error("❌ Check account error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
