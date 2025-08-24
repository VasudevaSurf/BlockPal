// src/app/api/auth/register/route.ts - UPDATED
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { connectToDatabase } from "@/lib/mongodb";

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();

    console.log("Registration attempt for username:", username);

    if (!username || !password) {
      return NextResponse.json(
        { error: "Username and password are required" },
        { status: 400 }
      );
    }

    const { db } = await connectToDatabase();

    // Check if username already exists
    const existingUser = await db.collection("users").findOne({
      username: username.toLowerCase(),
    });

    if (existingUser) {
      console.log("Username already exists:", username);
      return NextResponse.json(
        { error: "Username already exists" },
        { status: 409 }
      );
    }

    // Hash password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Create new user
    const newUser = {
      username: username.toLowerCase(),
      displayName: username, // Use username as display name
      avatar: `https://avatars.dicebear.com/api/identicon/${username}.svg`,
      passwordHash,
      preferences: { notifications: true },
      currency: "USD",
      Holder: false,
      createdAt: new Date(),
      lastLoginAt: new Date(),
      authProvider: "wallet", // Mark as wallet-based auth
      // No email or gmail field needed
    };

    const result = await db.collection("users").insertOne(newUser);

    console.log("User created successfully:", username);

    // Create JWT token
    const token = jwt.sign(
      { userId: result.insertedId.toString(), username: newUser.username },
      process.env.JWT_SECRET || "your-secret-key",
      { expiresIn: "24h" }
    );

    const userData = {
      id: result.insertedId.toString(),
      username: newUser.username,
      displayName: newUser.displayName,
      avatar: newUser.avatar,
      currency: newUser.currency,
    };

    const response = NextResponse.json({
      user: userData,
      token,
    });

    // Set HTTP-only cookie
    response.cookies.set("auth-token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      path: "/",
    });

    console.log("Registration successful, cookie set");

    return response;
  } catch (error) {
    console.error("Register error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
