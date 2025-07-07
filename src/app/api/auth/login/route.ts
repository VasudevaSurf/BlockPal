// src/app/api/auth/login/route.ts - UPDATED with 2FA support
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { connectToDatabase } from "@/lib/mongodb";

export async function POST(request: NextRequest) {
  try {
    const { email, password, twoFactorCode } = await request.json();

    console.log("=== LOGIN ATTEMPT START ===");
    console.log("Email:", email);
    console.log("Password provided:", !!password);
    console.log("2FA code provided:", !!twoFactorCode);

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
    console.log("👥 User has 2FA enabled:", !!user.twoFactorEnabled);

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

    // NEW: Check if 2FA is enabled
    if (user.twoFactorEnabled && user.twoFactorSecret) {
      console.log("🔐 2FA is enabled, checking for code...");

      if (!twoFactorCode) {
        console.log("ℹ️ 2FA code required but not provided");
        return NextResponse.json(
          {
            error: "2FA_REQUIRED",
            message: "Two-factor authentication code is required",
            requiresTwoFactor: true,
          },
          { status: 200 } // Use 200 status for 2FA required
        );
      }

      // Verify 2FA code
      const speakeasy = require("speakeasy");

      console.log("🔍 Verifying 2FA code...");

      let verified = false;

      // Try TOTP verification first
      try {
        verified = speakeasy.totp.verify({
          secret: user.twoFactorSecret,
          encoding: "base32",
          token: twoFactorCode,
          window: 2, // Allow some time drift
        });
      } catch (error) {
        console.error("❌ TOTP verification failed:", error);
      }

      // If TOTP fails, try backup codes
      if (
        !verified &&
        user.twoFactorBackupCodes &&
        user.twoFactorBackupCodes.length > 0
      ) {
        console.log("🔄 Trying backup codes...");

        const codeIndex = user.twoFactorBackupCodes.findIndex(
          (backupCode: string) =>
            backupCode.toLowerCase() === twoFactorCode.toLowerCase()
        );

        if (codeIndex !== -1) {
          verified = true;
          console.log("✅ Backup code verified, removing used code");

          // Remove used backup code
          const updatedBackupCodes = [...user.twoFactorBackupCodes];
          updatedBackupCodes.splice(codeIndex, 1);

          await db
            .collection("users")
            .updateOne(
              { _id: user._id },
              { $set: { twoFactorBackupCodes: updatedBackupCodes } }
            );
        }
      }

      if (!verified) {
        console.log("❌ Invalid 2FA code");
        return NextResponse.json(
          {
            error: "Invalid two-factor authentication code",
            requiresTwoFactor: true,
          },
          { status: 401 }
        );
      }

      console.log("✅ 2FA verification successful");
    }

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
