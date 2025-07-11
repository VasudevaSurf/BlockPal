// src/app/api/auth/google/route.ts - FIXED with proper 2FA support
import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { connectToDatabase } from "@/lib/mongodb";

export async function POST(request: NextRequest) {
  try {
    const { email, name, photoURL, uid, action, twoFactorCode } =
      await request.json();

    console.log("=== GOOGLE AUTH START ===");
    console.log("Action:", action); // "login" or "register"
    console.log("Email:", email);
    console.log("Name:", name);
    console.log("UID:", uid);
    console.log("2FA code provided:", !!twoFactorCode);

    if (!email || !name || !uid || !action) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const { db } = await connectToDatabase();

    // Check if user already exists
    let user = await db.collection("users").findOne({ gmail: email });

    if (action === "login") {
      // LOGIN: User must already exist
      if (!user) {
        console.log("❌ Google login failed: User not found:", email);
        return NextResponse.json(
          {
            error:
              "No account found with this Google email. Please register first, or if you have an account with this email, sign in using email and password.",
          },
          { status: 404 }
        );
      }

      console.log("✅ Existing user found for login:", email);
      console.log("👥 User has 2FA enabled:", !!user.twoFactorEnabled);

      // Check if this is a Google user or email/password user
      if (!user.googleId && user.passwordHash) {
        // User exists but was created with email/password, not Google
        console.log("ℹ️ User exists but not a Google account:", email);
        return NextResponse.json(
          {
            error:
              "This email is associated with an email/password account. Please sign in using your email and password, or use 'Forgot Password' if needed.",
          },
          { status: 400 }
        );
      }

      // FIXED: Proper 2FA check for Google login
      if (user.twoFactorEnabled && user.twoFactorSecret) {
        console.log("🔐 2FA is enabled for Google user, checking for code...");

        if (!twoFactorCode) {
          console.log("ℹ️ 2FA code required but not provided for Google login");
          return NextResponse.json(
            {
              error: "2FA_REQUIRED",
              message: "Two-factor authentication code is required",
              requiresTwoFactor: true,
            },
            { status: 200 } // FIXED: Use 200 status so frontend knows this is a 2FA requirement, not an error
          );
        }

        // Verify 2FA code
        const speakeasy = require("speakeasy");

        console.log("🔍 Verifying 2FA code for Google login...");

        let verified = false;

        // Try TOTP verification first
        try {
          verified = speakeasy.totp.verify({
            secret: user.twoFactorSecret,
            encoding: "base32",
            token: twoFactorCode,
            window: 2,
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
          console.log("🔄 Trying backup codes for Google login...");

          const codeIndex = user.twoFactorBackupCodes.findIndex(
            (backupCode: string) =>
              backupCode.toLowerCase() === twoFactorCode.toLowerCase()
          );

          if (codeIndex !== -1) {
            verified = true;
            console.log(
              "✅ Backup code verified for Google login, removing used code"
            );

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
          console.log("❌ Invalid 2FA code for Google login");
          return NextResponse.json(
            {
              error: "Invalid two-factor authentication code",
              requiresTwoFactor: true,
            },
            { status: 401 }
          );
        }

        console.log("✅ 2FA verification successful for Google login");
      }

      // Update last login and ensure Google ID is set
      await db.collection("users").updateOne(
        { _id: user._id },
        {
          $set: {
            lastLoginAt: new Date(),
            googleId: uid,
            authProvider: "google",
            // Update avatar if provided and different
            ...(photoURL && photoURL !== user.avatar && { avatar: photoURL }),
            // Update display name if provided and different
            ...(name && name !== user.displayName && { displayName: name }),
          },
        }
      );

      // Refresh user data after update
      user = await db.collection("users").findOne({ gmail: email });
    } else if (action === "register") {
      // REGISTER: User must NOT already exist
      if (user) {
        console.log(
          "❌ Google registration failed: User already exists:",
          email
        );

        // Check the authentication provider to give specific error message
        if (user.authProvider === "google" || user.googleId) {
          return NextResponse.json(
            {
              error:
                "An account with this Google email already exists. Please sign in with Google instead.",
            },
            { status: 409 }
          );
        } else {
          // User exists but was created with email/password
          return NextResponse.json(
            {
              error:
                "An account with this email already exists. Please sign in with email and password, or use the 'Forgot Password' option if you don't remember your password.",
            },
            { status: 409 }
          );
        }
      }

      console.log("✨ Creating new user from Google registration");

      // Create username from email
      const baseUsername = email.split("@")[0];
      let username = baseUsername;

      // Check if username already exists and make it unique
      let usernameExists = await db.collection("users").findOne({ username });
      let counter = 1;

      while (usernameExists) {
        username = `${baseUsername}_${Math.random().toString(36).substr(2, 4)}`;
        usernameExists = await db.collection("users").findOne({ username });
        counter++;

        // Prevent infinite loop
        if (counter > 10) {
          username = `${baseUsername}_${Date.now()}`;
          break;
        }
      }

      // Create new user
      const newUser = {
        username,
        gmail: email,
        displayName: name,
        avatar:
          photoURL ||
          `https://avatars.dicebear.com/api/identicon/${username}.svg`,
        googleId: uid,
        passwordHash: null, // Google users don't have passwords
        preferences: { notifications: true },
        currency: "USD",
        Holder: false,
        createdAt: new Date(),
        lastLoginAt: new Date(),
        authProvider: "google",
        // Google users start with 2FA disabled by default
        twoFactorEnabled: false,
      };

      const result = await db.collection("users").insertOne(newUser);
      user = { ...newUser, _id: result.insertedId };

      console.log(
        "✅ New Google user created:",
        email,
        "with username:",
        username
      );
    } else {
      return NextResponse.json(
        { error: "Invalid action. Must be 'login' or 'register'" },
        { status: 400 }
      );
    }

    // Create JWT token
    const jwtSecret = process.env.JWT_SECRET || "your-secret-key";
    const token = jwt.sign(
      { userId: user._id.toString(), username: user.username },
      jwtSecret,
      { expiresIn: "24h" }
    );

    console.log("✅ Google auth token created for action:", action);

    // Return user data
    const userData = {
      id: user._id.toString(),
      username: user.username,
      displayName: user.displayName,
      email: user.gmail,
      avatar: user.avatar,
      currency: user.currency,
    };

    const response = NextResponse.json({
      user: userData,
      token,
      action, // Return the action for frontend reference
    });

    // Set HTTP-only cookie
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax" as const,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      path: "/",
    };

    response.cookies.set("auth-token", token, cookieOptions);

    console.log(`=== GOOGLE ${action.toUpperCase()} SUCCESS ===`);

    return response;
  } catch (error) {
    console.error("❌ Google auth error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
