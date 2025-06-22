import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

import { connectToDatabase } from "@/lib/mongodb";

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    console.log("=== LOGIN ATTEMPT START ===");
    console.log("Email:", email);
    console.log("Password provided:", !!password);

    const { db } = await connectToDatabase();

    // Find user by email
    const user = await db.collection("users").findOne({ gmail: email });

    if (!user) {
      console.log("❌ User not found:", email);
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    console.log("✅ User found:", user.username);

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.passwordHash);

    if (!isValidPassword) {
      console.log("❌ Invalid password for user:", email);
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    console.log("✅ Password valid");

    // Update last login
    await db
      .collection("users")
      .updateOne({ _id: user._id }, { $set: { lastLoginAt: new Date() } });

    console.log("✅ Last login updated");

    // Create JWT token
    const jwtSecret = process.env.JWT_SECRET || "your-secret-key";
    console.log("JWT Secret exists:", !!jwtSecret);

    const token = jwt.sign(
      { userId: user._id.toString(), username: user.username },
      jwtSecret,
      { expiresIn: "24h" }
    );

    console.log("✅ Token created:", token.substring(0, 50) + "...");

    // Return user data (excluding password)
    const userData = {
      id: user._id.toString(),
      username: user.username,
      displayName: user.displayName,
      email: user.gmail,
      avatar: user.avatar,
      currency: user.currency,
    };

    console.log("✅ User data prepared:", userData);

    const response = NextResponse.json({
      user: userData,
      token,
    });

    // Set HTTP-only cookie
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax" as const,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      path: "/",
    };

    console.log("🍪 Cookie options:", cookieOptions);
    console.log(
      "🍪 Setting cookie with token:",
      token.substring(0, 30) + "..."
    );

    response.cookies.set("auth-token", token, cookieOptions);

    // Verify cookie was set
    const setCookieHeader = response.headers.get("set-cookie");
    console.log("🍪 Set-Cookie header:", setCookieHeader);

    console.log("=== LOGIN SUCCESS ===");

    return response;
  } catch (error) {
    console.error("❌ Login error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
